import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { round2 } from '../common/round.util';
import { addMonthsYM, isValidDateStr, todayStr } from '../finances/date.util';
import {
  BudgetCategoryEntity,
  BudgetCategoryKind,
} from './entities/budget-category.entity';
import { BudgetTransactionEntity } from './entities/budget-transaction.entity';
import { BudgetSettingsEntity } from './entities/budget-settings.entity';
import { BudgetMonthPlanEntity } from './entities/budget-month-plan.entity';
import {
  BudgetSettingsInput,
  CATEGORY_KINDS,
  CategoryInput,
  CategoryStatus,
  PlanInput,
  TransactionInput,
} from './types';

const NAME_MAX = 60;
const LABEL_MAX = 120;
const SETTINGS_ID = 'me';
const MONTH_RE = /^\d{4}-\d{2}$/;
/** Palette par défaut (couleurs hex concrètes pour les SVG). */
const DEFAULT_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#f87171', '#22d3ee'];

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(BudgetCategoryEntity)
    private readonly categories: Repository<BudgetCategoryEntity>,
    @InjectRepository(BudgetTransactionEntity)
    private readonly transactions: Repository<BudgetTransactionEntity>,
    @InjectRepository(BudgetSettingsEntity)
    private readonly settings: Repository<BudgetSettingsEntity>,
    @InjectRepository(BudgetMonthPlanEntity)
    private readonly plans: Repository<BudgetMonthPlanEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Catégories (le « plan »)
  // ---------------------------------------------------------------------------

  async listCategories(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'active' as const };
    return this.categories.find({ where, order: { position: 'ASC' } });
  }

  async createCategory(input: CategoryInput) {
    const name = this.validateName(input.name);
    await this.assertNameUnique(name, null);
    const kind = this.validateKind(input.kind);
    const maxPos = await this.maxPosition();
    const color = input.color || DEFAULT_COLORS[(maxPos + 1) % DEFAULT_COLORS.length];
    return this.categories.save(
      this.categories.create({
        name,
        kind,
        color,
        icon: (input.icon || '').slice(0, 8),
        position: maxPos + 1,
        status: 'active',
      }),
    );
  }

  async updateCategory(id: string, input: CategoryInput) {
    const cat = await this.getCategoryOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateName(input.name);
      await this.assertNameUnique(name, id);
      cat.name = name;
    }
    if (input.kind !== undefined) cat.kind = this.validateKind(input.kind);
    if (input.color !== undefined) cat.color = input.color;
    if (input.icon !== undefined) cat.icon = input.icon.slice(0, 8);
    return this.categories.save(cat);
  }

  async archiveCategory(id: string) {
    const cat = await this.getCategoryOrThrow(id);
    cat.status = 'archived';
    return this.categories.save(cat);
  }

  async unarchiveCategory(id: string) {
    const cat = await this.getCategoryOrThrow(id);
    cat.status = 'active';
    return this.categories.save(cat);
  }

  async removeCategory(id: string): Promise<void> {
    await this.getCategoryOrThrow(id);
    const used = await this.transactions.count({ where: { categoryId: id } });
    if (used > 0) {
      throw new BadRequestException(
        'Cette catégorie est utilisée par des transactions. Archivez-la plutôt que de la supprimer.',
      );
    }
    await this.categories.delete(id);
  }

  async reorderCategories(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(ids.map((id, index) => this.categories.update(id, { position: index })));
    return this.listCategories();
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async listTransactions(monthParam?: string) {
    const month = this.resolveMonth(monthParam);
    const { start, end } = monthBounds(month);
    const rows = await this.transactions.find({
      where: { date: Between(start, end) },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((t) => this.decorateTransaction(t));
  }

  async createTransaction(input: TransactionInput) {
    const kind = input.kind === 'entree' ? 'entree' : 'sortie';
    const amount = this.validateAmount(input.amount);
    const date = isValidDateStr(input.date) ? (input.date as string) : todayStr();

    let categoryId: string | null = null;
    if (kind === 'sortie') {
      if (!input.categoryId) {
        throw new BadRequestException('Une dépense doit être rattachée à une catégorie.');
      }
      const cat = await this.getCategoryOrThrow(input.categoryId);
      if (cat.status !== 'active') {
        throw new BadRequestException('La catégorie est archivée.');
      }
      categoryId = cat.id;
    }

    await this.transactions.save(
      this.transactions.create({
        kind,
        date,
        amount,
        categoryId,
        label: this.normalizeLabel(input.label),
      }),
    );
    return this.overview(date.slice(0, 7));
  }

  async updateTransaction(id: string, input: TransactionInput) {
    const tx = await this.getTransactionOrThrow(id);
    if (input.kind !== undefined) tx.kind = input.kind === 'entree' ? 'entree' : 'sortie';
    if (input.amount !== undefined) tx.amount = this.validateAmount(input.amount);
    if (input.date !== undefined) {
      if (!isValidDateStr(input.date)) {
        throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
      }
      tx.date = input.date;
    }
    if (input.label !== undefined) tx.label = this.normalizeLabel(input.label);
    if (tx.kind === 'entree') {
      tx.categoryId = null;
    } else if (input.categoryId !== undefined || tx.categoryId == null) {
      const id2 = input.categoryId ?? tx.categoryId;
      if (!id2) throw new BadRequestException('Une dépense doit être rattachée à une catégorie.');
      const cat = await this.getCategoryOrThrow(id2);
      tx.categoryId = cat.id;
    }
    await this.transactions.save(tx);
    return this.overview(tx.date.slice(0, 7));
  }

  async removeTransaction(id: string) {
    const tx = await this.getTransactionOrThrow(id);
    const month = tx.date.slice(0, 7);
    await this.transactions.delete(id);
    return this.overview(month);
  }

  // ---------------------------------------------------------------------------
  // Réglages (singleton)
  // ---------------------------------------------------------------------------

  async getSettings(): Promise<BudgetSettingsEntity> {
    let cfg = await this.settings.findOne({ where: { id: SETTINGS_ID } });
    if (!cfg) {
      cfg = await this.settings.save(
        this.settings.create({ id: SETTINGS_ID, plannedIncome: null }),
      );
    }
    return cfg;
  }

  async updateSettings(input: BudgetSettingsInput) {
    const cfg = await this.getSettings();
    if (input.plannedIncome !== undefined) {
      cfg.plannedIncome =
        input.plannedIncome === null || (input.plannedIncome as unknown) === ''
          ? null
          : this.validateAmount(input.plannedIncome, true);
    }
    return this.settings.save(cfg);
  }

  // ---------------------------------------------------------------------------
  // Vue d'ensemble d'un mois (plan vs réel)
  // ---------------------------------------------------------------------------

  async overview(monthParam?: string) {
    const month = this.resolveMonth(monthParam);
    const { start, end } = monthBounds(month);

    const [cats, txs, cfg, plan] = await Promise.all([
      this.categories.find({ order: { position: 'ASC' } }),
      this.transactions.find({
        where: { date: Between(start, end) },
        order: { date: 'DESC', createdAt: 'DESC' },
      }),
      this.getSettings(),
      this.effectivePlan(month),
    ]);

    const income = round2(
      txs.filter((t) => t.kind === 'entree').reduce((s, t) => s + t.amount, 0),
    );
    const totalSpent = round2(
      txs.filter((t) => t.kind === 'sortie').reduce((s, t) => s + t.amount, 0),
    );

    // Somme des sorties par catégorie.
    const spentByCat = new Map<string, number>();
    for (const t of txs) {
      if (t.kind !== 'sortie' || !t.categoryId) continue;
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
    }

    // Cibles du mois : % de chaque catégorie (plan effectif, hérité si besoin).
    const byId = new Map(cats.map((c) => [c.id, c]));
    const planMap = new Map<string, number>();
    for (const r of plan.rows) {
      const c = byId.get(r.categoryId);
      if (c && c.status === 'active') planMap.set(r.categoryId, r.targetPct);
    }

    // Catégories à afficher : dans le plan (actives) ∪ ayant des sorties ce mois-ci.
    const ids = new Set<string>([...planMap.keys(), ...spentByCat.keys()]);
    const visible = [...ids]
      .map((id) => byId.get(id))
      .filter((c): c is BudgetCategoryEntity => Boolean(c))
      .sort((a, b) => a.position - b.position);

    const categories = visible.map((c) => {
      const real = round2(spentByCat.get(c.id) ?? 0);
      const targetPct = planMap.has(c.id) ? round2(planMap.get(c.id) as number) : null;
      const targetEur = targetPct != null && income > 0 ? round2((targetPct / 100) * income) : null;
      const realPctOfIncome = income > 0 ? round2((real / income) * 100) : null;
      const sharePct = totalSpent > 0 ? round2((real / totalSpent) * 100) : 0;
      const ecartEur = targetEur != null ? round2(real - targetEur) : null;
      let status: CategoryStatus = null;
      if (targetEur != null) {
        if (c.kind === 'epargne') status = real >= targetEur ? 'reached' : 'insufficient';
        else status = real > targetEur ? 'over' : 'within';
      }
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        kind: c.kind,
        status: c.status,
        inPlan: planMap.has(c.id),
        targetPct,
        targetEur,
        real,
        realPctOfIncome,
        sharePct,
        ecartEur,
        state: status,
      };
    });

    const planTotalPct = round2([...planMap.values()].reduce((s, p) => s + p, 0));

    // Camembert du réel : catégories ayant des sorties.
    const pie = categories
      .filter((c) => c.real > 0)
      .map((c) => ({ key: c.id, label: c.name, color: c.color, total: c.real, pct: c.sharePct }))
      .sort((a, b) => b.total - a.total);

    return {
      month,
      income,
      totalSpent,
      remaining: round2(income - totalSpent),
      planTotalPct,
      hasCategories: cats.some((c) => c.status === 'active'),
      hasPlan: plan.rows.length > 0,
      planInherited: plan.inherited,
      planSource: plan.inherited ? plan.source : null,
      plannedIncome: cfg.plannedIncome ?? null,
      categories,
      allCategories: cats
        .filter((c) => c.status === 'active')
        .map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, kind: c.kind })),
      pie,
      transactions: txs.map((t) => this.decorateTransaction(t, visible)),
    };
  }

  // ---------------------------------------------------------------------------
  // Vue cash-flow d'un mois (entrées vs sorties, taux d'épargne, report)
  // ---------------------------------------------------------------------------

  /**
   * Photographie des **flux** d'un mois : entrées vs sorties, solde du mois,
   * taux d'épargne (versements épargne / revenu), **report** cumulé des mois
   * antérieurs et solde de fin de mois, + un historique court pour la tendance.
   */
  async cashflow(monthParam?: string) {
    const month = this.resolveMonth(monthParam);
    const { end } = monthBounds(month);

    // Toutes les transactions jusqu'à la fin du mois (pour le report cumulé).
    const [upto, cats] = await Promise.all([
      this.transactions.find({
        where: { date: LessThanOrEqual(end) },
        order: { date: 'ASC' },
      }),
      this.categories.find({ order: { position: 'ASC' } }),
    ]);

    const byId = new Map(cats.map((c) => [c.id, c]));
    const savingsCatIds = new Set(
      cats.filter((c) => c.kind === 'epargne').map((c) => c.id),
    );

    // Agrégat par mois : entrées, sorties, dont versements d'épargne.
    type MonthAgg = { income: number; expenses: number; savings: number };
    const perMonth = new Map<string, MonthAgg>();
    const ensure = (m: string): MonthAgg => {
      let a = perMonth.get(m);
      if (!a) perMonth.set(m, (a = { income: 0, expenses: 0, savings: 0 }));
      return a;
    };
    // Sorties par catégorie pour le mois courant (camembert).
    const spentByCat = new Map<string, number>();
    for (const t of upto) {
      const m = t.date.slice(0, 7);
      const agg = ensure(m);
      if (t.kind === 'entree') {
        agg.income += t.amount;
      } else {
        agg.expenses += t.amount;
        if (t.categoryId && savingsCatIds.has(t.categoryId)) agg.savings += t.amount;
        if (m === month && t.categoryId) {
          spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
        }
      }
    }

    const cur = perMonth.get(month) ?? { income: 0, expenses: 0, savings: 0 };
    const income = round2(cur.income);
    const expenses = round2(cur.expenses);
    const net = round2(income - expenses);
    const savings = round2(cur.savings);
    const savingsRate = income > 0 ? round2((savings / income) * 100) : null;

    // Report : net cumulé de tous les mois strictement antérieurs → solde de fin.
    let carryIn = 0;
    for (const [m, a] of perMonth) {
      if (m < month) carryIn += a.income - a.expenses;
    }
    carryIn = round2(carryIn);
    const endBalance = round2(carryIn + net);

    // Mois précédent (immédiat) : son solde, qu'il ait ou non des transactions.
    const prev = shiftMonth(month, -1);
    const prevAgg = perMonth.get(prev) ?? { income: 0, expenses: 0, savings: 0 };
    const previousMonth = {
      month: prev,
      net: round2(prevAgg.income - prevAgg.expenses),
    };

    // Historique : 6 mois (du plus ancien au plus récent), mois courant inclus.
    const history: { month: string; income: number; expenses: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = shiftMonth(month, -i);
      const a = perMonth.get(m) ?? { income: 0, expenses: 0, savings: 0 };
      history.push({
        month: m,
        income: round2(a.income),
        expenses: round2(a.expenses),
        net: round2(a.income - a.expenses),
      });
    }

    // Répartition des sorties du mois par catégorie (format Donut).
    const pie = [...spentByCat.entries()]
      .map(([id, total]) => {
        const c = byId.get(id);
        return {
          key: id,
          label: c?.name ?? '—',
          color: c?.color ?? '#94a3b8',
          total: round2(total),
          pct: expenses > 0 ? round2((total / expenses) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      month,
      income,
      expenses,
      net,
      savings,
      savingsRate,
      carryIn,
      endBalance,
      previousMonth,
      hasData: income > 0 || expenses > 0 || carryIn !== 0,
      history,
      pie,
    };
  }

  // ---------------------------------------------------------------------------
  // Plan mensuel (catégories partagées, % par mois)
  // ---------------------------------------------------------------------------

  /**
   * Plan effectif d'un mois : ses propres lignes si elles existent, sinon **héritage**
   * du dernier plan défini (mois le plus récent < `month`, à défaut le plus récent).
   */
  private async effectivePlan(
    month: string,
  ): Promise<{ rows: BudgetMonthPlanEntity[]; inherited: boolean; source: string | null }> {
    const own = await this.plans.find({ where: { month } });
    if (own.length > 0) return { rows: own, inherited: false, source: month };
    const months = (
      await this.plans
        .createQueryBuilder('p')
        .select('DISTINCT p.month', 'month')
        .orderBy('p.month', 'DESC')
        .getRawMany<{ month: string }>()
    ).map((r) => r.month);
    const src = months.find((m) => m < month) ?? months[0] ?? null;
    if (!src) return { rows: [], inherited: false, source: null };
    return { rows: await this.plans.find({ where: { month: src } }), inherited: true, source: src };
  }

  /** Plan d'un mois pour l'éditeur : toutes les catégories actives + leur % (hérité). */
  async getPlanEditor(monthParam?: string) {
    const month = this.resolveMonth(monthParam);
    const [cats, plan] = await Promise.all([
      this.categories.find({ where: { status: 'active' }, order: { position: 'ASC' } }),
      this.effectivePlan(month),
    ]);
    const map = new Map(plan.rows.map((r) => [r.categoryId, r.targetPct]));
    return {
      month,
      inherited: plan.inherited,
      source: plan.inherited ? plan.source : null,
      categories: cats.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        kind: c.kind,
        position: c.position,
        inPlan: map.has(c.id),
        targetPct: round2(map.get(c.id) ?? 0),
      })),
    };
  }

  /** Définit (matérialise) le plan d'un mois : remplace ses lignes par `items`. */
  async setMonthPlan(monthParam: string | undefined, input: PlanInput) {
    const month = this.resolveMonth(monthParam);
    const items = Array.isArray(input.items) ? input.items : [];
    const rows: BudgetMonthPlanEntity[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      if (!it || !it.categoryId || seen.has(it.categoryId)) continue;
      const cat = await this.getCategoryOrThrow(it.categoryId);
      if (cat.status !== 'active') continue;
      seen.add(cat.id);
      rows.push(
        this.plans.create({ month, categoryId: cat.id, targetPct: this.validatePct(it.targetPct ?? 0) }),
      );
    }
    await this.plans.delete({ month });
    if (rows.length) await this.plans.save(rows);
    return this.getPlanEditor(month);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private decorateTransaction(t: BudgetTransactionEntity, cats?: BudgetCategoryEntity[]) {
    const cat = t.categoryId && cats ? cats.find((c) => c.id === t.categoryId) : null;
    return {
      id: t.id,
      kind: t.kind,
      date: t.date,
      amount: round2(t.amount),
      categoryId: t.categoryId,
      categoryName: cat?.name ?? null,
      categoryColor: cat?.color ?? null,
      label: t.label,
    };
  }

  private resolveMonth(month?: string): string {
    if (month && MONTH_RE.test(month)) return month;
    return todayStr().slice(0, 7);
  }

  private async maxPosition(): Promise<number> {
    const row = await this.categories
      .createQueryBuilder('c')
      .select('MAX(c.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async getCategoryOrThrow(id: string): Promise<BudgetCategoryEntity> {
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie introuvable.');
    return cat;
  }

  private async getTransactionOrThrow(id: string): Promise<BudgetTransactionEntity> {
    const tx = await this.transactions.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction introuvable.');
    return tx;
  }

  private async assertNameUnique(name: string, exceptId: string | null): Promise<void> {
    const qb = this.categories
      .createQueryBuilder('c')
      .where('c.status = :status', { status: 'active' })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('c.id != :exceptId', { exceptId });
    if (await qb.getOne()) {
      throw new BadRequestException('Une catégorie porte déjà ce nom.');
    }
  }

  private validateName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > NAME_MAX) {
      throw new BadRequestException(`Le nom ne peut dépasser ${NAME_MAX} caractères.`);
    }
    return trimmed;
  }

  private validatePct(value?: number): number {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('Le % cible doit être un nombre entre 0 et 100.');
    }
    return round2(pct);
  }

  private validateKind(kind?: BudgetCategoryKind): BudgetCategoryKind {
    if (kind === undefined) return 'depense';
    if (!CATEGORY_KINDS.includes(kind)) {
      throw new BadRequestException('Type de catégorie invalide.');
    }
    return kind;
  }

  /** Montant > 0 (ou ≥ 0 si `allowZero`). */
  private validateAmount(value?: number | null, allowZero = false): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) {
      throw new BadRequestException(
        `Le montant doit être un nombre ${allowZero ? '≥ 0' : '> 0'}.`,
      );
    }
    return round2(amount);
  }

  private normalizeLabel(label?: string | null): string | null {
    if (label === null || label === undefined) return null;
    const trimmed = String(label).trim();
    return trimmed ? trimmed.slice(0, LABEL_MAX) : null;
  }
}

/** Bornes `YYYY-MM-DD` (inclusives) d'un mois `YYYY-MM`. */
function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

/** Décale un mois `YYYY-MM` de `delta` mois. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const r = addMonthsYM(y, m, delta);
  return `${r.year}-${String(r.month).padStart(2, '0')}`;
}
