import { createHash } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isValidDateStr } from '../common/date.util';
import { round2 } from '../common/round.util';
import { BudgetCategoryEntity } from './entities/budget-category.entity';
import {
  BudgetTransactionEntity,
  BudgetTransactionKind,
  LABEL_MAX,
} from './entities/budget-transaction.entity';
import {
  BudgetImportEntity,
  BudgetImportRow,
} from './entities/budget-import.entity';
import { buildCategoryIndex, categorize } from './import/categorizer';
import { merchantKey } from './import/merchant';
import { detectParser } from './import/parsers';
import { ImportFormatError } from './import/parser.types';
import { ImportPatchInput, ImportRowInput } from './types';

const FILENAME_MAX = 260;

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(BudgetImportEntity)
    private readonly imports: Repository<BudgetImportEntity>,
    @InjectRepository(BudgetTransactionEntity)
    private readonly transactions: Repository<BudgetTransactionEntity>,
    @InjectRepository(BudgetCategoryEntity)
    private readonly categories: Repository<BudgetCategoryEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Dépôt & analyse
  // ---------------------------------------------------------------------------

  /**
   * Analyse un fichier déposé, pré-remplit les lignes (type/date/montant/
   * catégorie/libellé) et crée le lot d'import. Le lot est `pending` (à vérifier)
   * dès qu'au moins une ligne est exploitable, sinon `error` (§8).
   */
  async upload(fileName: string | undefined, content: string | undefined) {
    const name = (fileName ?? 'import').slice(0, FILENAME_MAX);
    if (!content || !content.trim()) {
      throw new BadRequestException('Le fichier est vide.');
    }

    const parser = detectParser(content, name);
    if (!parser) {
      // Format global non reconnu : import « en erreur » sans lignes (§8).
      return this.saveErrorBatch(
        name,
        'unknown',
        'Format non reconnu',
        'Format de fichier non reconnu ou non supporté. Formats acceptés : Société Générale CSV.',
      );
    }

    let parsed;
    try {
      parsed = parser.parse(content);
    } catch (e) {
      if (e instanceof ImportFormatError) {
        return this.saveErrorBatch(name, parser.key, parser.label, e.message);
      }
      throw e;
    }

    // Empreintes anti-doublon (une par ligne exploitable), puis clés déjà en base.
    const keys = parsed.rows.map((r) =>
      this.dedupKey(r.date, r.kind, r.amount, r.raw),
    );
    const known = keys.filter((k): k is string => k !== null);
    const existing = new Set(
      known.length
        ? (
            await this.transactions.find({
              where: { dedupKey: In(known) },
              select: { dedupKey: true },
            })
          ).map((t) => t.dedupKey)
        : [],
    );

    const cats = buildCategoryIndex(
      await this.categories.find({ where: { status: 'active' } }),
    );
    const rows: BudgetImportRow[] = parsed.rows.map((r, i) => ({
      id: String(i),
      sourceLine: r.sourceLine,
      raw: r.raw,
      kind: r.kind,
      date: r.date,
      amount: r.amount,
      categoryId:
        r.kind === 'sortie' && !r.error ? categorize(r.label, cats) : null,
      label: r.label,
      merchantKey: merchantKey(r.label),
      dedupKey: keys[i],
      error: r.error,
      ignored: false,
      duplicate: keys[i] !== null && existing.has(keys[i]),
    }));

    const batch = await this.imports.save(
      this.imports.create({
        fileName: name,
        formatKey: parser.key,
        formatLabel: parser.label,
        status: 'pending',
        errorMessage: null,
        rows,
      }),
    );
    return this.buildDetail(batch);
  }

  // ---------------------------------------------------------------------------
  // Consultation
  // ---------------------------------------------------------------------------

  /** Historique des imports (résumé), le plus récent en premier (§7). */
  async list() {
    const [batches, catName] = await Promise.all([
      this.imports.find({ order: { createdAt: 'DESC' } }),
      this.categoryNames(),
    ]);
    return batches.map((b) => this.summary(b, catName));
  }

  /** Détail d'un import : lignes + résumé. */
  async detail(id: string) {
    return this.buildDetail(await this.getOrThrow(id));
  }

  // ---------------------------------------------------------------------------
  // Édition de la vérification (sans valider)
  // ---------------------------------------------------------------------------

  /** Enregistre la progression de la vérification (§3/§7) sans valider. */
  async patch(id: string, input: ImportPatchInput) {
    const batch = await this.getOrThrow(id);
    if (batch.status !== 'pending') {
      throw new BadRequestException(
        'Seul un import en attente de vérification peut être modifié.',
      );
    }
    this.applyPatches(batch, input);
    await this.imports.save(batch);
    return this.buildDetail(batch);
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Valide l'import : matérialise chaque ligne exploitable en transaction budget
   * (mois déterminé par la date). Idempotent : les doublons (`dedupKey` déjà
   * présent) et les lignes ignorées/en erreur sont exclus. Passe l'import à
   * `validated` (§4).
   */
  async validate(id: string, input: ImportPatchInput) {
    const batch = await this.getOrThrow(id);
    if (batch.status !== 'pending') {
      throw new BadRequestException(
        'Cet import a déjà été traité et ne peut plus être validé.',
      );
    }
    // Applique (et conserve) les dernières éditions envoyées avec la validation,
    // même si la validation échoue ensuite.
    if (input.rows?.length) {
      this.applyPatches(batch, input);
      await this.imports.save(batch);
    }

    // Les lignes à importer : ni ignorées, ni en erreur, ni doublons.
    const toImport = batch.rows.filter(
      (r) => !r.ignored && !r.error && !r.duplicate,
    );

    // Blocage tant qu'une ligne active manque d'un champ obligatoire (§3).
    const incomplete = toImport.filter((r) => this.isIncomplete(r));
    if (incomplete.length > 0) {
      throw new BadRequestException(
        `Champs obligatoires manquants sur ${incomplete.length} ligne(s). Complétez ou ignorez-les avant de valider.`,
      );
    }

    // Contrôle des catégories référencées.
    const catIds = [
      ...new Set(
        toImport
          .filter((r) => r.kind === 'sortie')
          .map((r) => r.categoryId as string),
      ),
    ];
    const cats = catIds.length
      ? await this.categories.find({ where: { id: In(catIds) } })
      : [];
    const active = new Set(
      cats.filter((c) => c.status === 'active').map((c) => c.id),
    );
    for (const r of toImport) {
      if (r.kind === 'sortie' && !active.has(r.categoryId as string)) {
        throw new BadRequestException(
          `Ligne ${r.sourceLine} : catégorie introuvable ou archivée.`,
        );
      }
    }

    // Matérialisation. `onConflictDoNothing` sur `dedupKey` garantit
    // l'idempotence même en cas de doublon concurrent.
    const entities = toImport.map((r) =>
      this.transactions.create({
        kind: r.kind as BudgetTransactionKind,
        date: r.date as string,
        amount: round2(r.amount as number),
        categoryId: r.kind === 'sortie' ? r.categoryId : null,
        label: r.label,
        dedupKey: r.dedupKey,
      }),
    );
    if (entities.length) {
      await this.transactions
        .createQueryBuilder()
        .insert()
        .values(entities)
        .orIgnore()
        .execute();
    }

    batch.status = 'validated';
    await this.imports.save(batch);
    return this.buildDetail(batch);
  }

  /** Supprime un lot d'import (n'affecte pas les transactions déjà validées). */
  async remove(id: string): Promise<void> {
    const res = await this.imports.delete(id);
    if (!res.affected) throw new NotFoundException('Import introuvable.');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Crée un lot « en erreur » sans lignes (fichier illisible, §8). */
  private async saveErrorBatch(
    fileName: string,
    formatKey: string,
    formatLabel: string,
    errorMessage: string,
  ) {
    const batch = await this.imports.save(
      this.imports.create({
        fileName,
        formatKey,
        formatLabel,
        status: 'error',
        errorMessage,
        rows: [],
      }),
    );
    return this.buildDetail(batch);
  }

  /** Détail d'un lot déjà chargé (résumé + lignes), sans relecture en base. */
  private async buildDetail(batch: BudgetImportEntity) {
    return {
      ...this.summary(batch, await this.categoryNames()),
      errorMessage: batch.errorMessage,
      rows: batch.rows,
    };
  }

  /** `id` → nom, pour décorer les résumés. */
  private async categoryNames(): Promise<Map<string, string>> {
    const cats = await this.categories.find();
    return new Map(cats.map((c) => [c.id, c.name]));
  }

  /** Résumé d'un lot pour l'écran de suivi (§7) — une seule passe sur les lignes. */
  private summary(b: BudgetImportEntity, catName: Map<string, string>) {
    let duplicateCount = 0;
    let errorCount = 0;
    let ignoredCount = 0;
    let importableCount = 0;
    let expenses = 0;
    let income = 0;
    const months = new Set<string>();
    const byCategory = new Map<
      string | null,
      { total: number; count: number }
    >();
    const byMonth = new Map<string, number>();

    for (const r of b.rows) {
      if (r.duplicate) duplicateCount += 1;
      if (r.error) errorCount += 1;
      if (r.ignored) ignoredCount += 1;
      if (r.ignored || r.error || r.duplicate) continue;
      importableCount += 1;
      if (r.date) months.add(r.date.slice(0, 7));
      if (r.amount == null) continue;
      if (r.kind === 'sortie') {
        expenses += r.amount;
        const key = r.categoryId ?? null;
        const agg = byCategory.get(key) ?? { total: 0, count: 0 };
        agg.total += r.amount;
        agg.count += 1;
        byCategory.set(key, agg);
      } else if (r.kind === 'entree') {
        income += r.amount;
      }
      if (r.date) {
        const m = r.date.slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
      }
    }

    return {
      id: b.id,
      fileName: b.fileName,
      formatKey: b.formatKey,
      formatLabel: b.formatLabel,
      status: b.status,
      createdAt: b.createdAt,
      months: [...months].sort(),
      detectedCount: b.rows.length,
      importableCount,
      duplicateCount,
      errorCount,
      ignoredCount,
      // Résumé (surtout utile pour un import validé, §7).
      summary: {
        totalExpenses: round2(expenses),
        totalIncome: round2(income),
        byCategory: [...byCategory.entries()].map(([categoryId, agg]) => ({
          categoryId,
          categoryName: categoryId ? (catName.get(categoryId) ?? null) : null,
          total: round2(agg.total),
          count: agg.count,
        })),
        byMonth: [...byMonth.entries()]
          .sort(([a], [b2]) => a.localeCompare(b2))
          .map(([month, count]) => ({ month, count })),
      },
    };
  }

  /** Applique les éditions de lignes à un lot chargé (sans sauvegarder). */
  private applyPatches(batch: BudgetImportEntity, input: ImportPatchInput) {
    const patches = new Map((input.rows ?? []).map((r) => [r.id, r] as const));
    batch.rows = batch.rows.map((row) => {
      const p = patches.get(row.id);
      return p ? this.applyRowPatch(row, p) : row;
    });
  }

  private applyRowPatch(
    row: BudgetImportRow,
    p: ImportRowInput,
  ): BudgetImportRow {
    const next: BudgetImportRow = { ...row };
    if (p.ignored !== undefined) next.ignored = Boolean(p.ignored);
    if (p.kind !== undefined)
      next.kind = p.kind === 'entree' || p.kind === 'sortie' ? p.kind : null;
    if (p.date !== undefined)
      next.date = p.date && isValidDateStr(p.date) ? p.date : null;
    if (p.amount !== undefined) {
      const n = Number(p.amount);
      next.amount = Number.isFinite(n) && n > 0 ? round2(n) : null;
    }
    if (p.categoryId !== undefined) next.categoryId = p.categoryId || null;
    if (p.label !== undefined)
      next.label = p.label ? String(p.label).slice(0, LABEL_MAX) : null;
    // Une entrée n'a pas de catégorie.
    if (next.kind === 'entree') next.categoryId = null;
    // Édition manuelle : on lève l'erreur de parsing si les champs deviennent valides.
    if (next.error && next.date && next.amount && next.kind) next.error = null;
    return next;
  }

  /** Champ obligatoire manquant ? (type, date, montant, catégorie si sortie, §3.) */
  private isIncomplete(r: BudgetImportRow): boolean {
    return (
      !r.kind ||
      !r.date ||
      r.amount == null ||
      (r.kind === 'sortie' && !r.categoryId)
    );
  }

  /**
   * Empreinte anti-doublon : `sha256(date | montant signé | libellé brut)`.
   * Fondée sur la ligne brute d'origine pour être stable au ré-import du même
   * fichier ou de fichiers chevauchants. `null` si date/montant indéterminés.
   */
  private dedupKey(
    date: string | null,
    kind: BudgetTransactionKind | null,
    amount: number | null,
    raw: string,
  ): string | null {
    if (!date || amount == null) return null;
    const signed = kind === 'entree' ? amount : -amount;
    return createHash('sha256')
      .update(`${date}|${signed.toFixed(2)}|${raw.trim()}`)
      .digest('hex')
      .slice(0, 64);
  }

  private async getOrThrow(id: string): Promise<BudgetImportEntity> {
    const batch = await this.imports.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Import introuvable.');
    return batch;
  }
}
