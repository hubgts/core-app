import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  KnowHowComponent,
  KnowHowEntity,
  KnowHowStep,
} from './entities/knowhow.entity';
import { KnowHowCategoryEntity } from './entities/knowhow-category.entity';
import {
  CategoryInput,
  ComponentInput,
  DEFAULT_CATEGORIES,
  KnowHowInput,
  StepInput,
} from './types';

const TITLE_MAX = 120;
const CATEGORY_NAME_MAX = 40;

@Injectable()
export class KnowHowService implements OnModuleInit {
  constructor(
    @InjectRepository(KnowHowEntity)
    private readonly knowhow: Repository<KnowHowEntity>,
    @InjectRepository(KnowHowCategoryEntity)
    private readonly categories: Repository<KnowHowCategoryEntity>,
  ) {}

  /** Amorce le référentiel de catégories par défaut au premier démarrage. */
  async onModuleInit(): Promise<void> {
    const count = await this.categories.count();
    if (count > 0) return;
    await this.categories.save(
      DEFAULT_CATEGORIES.map((c, i) =>
        this.categories.create({
          name: c.name,
          nameKey: this.normalizeKey(c.name),
          icon: c.icon,
          color: c.color,
          isDefault: true,
          position: i,
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Catégories
  // ---------------------------------------------------------------------------

  async listCategories() {
    const cats = await this.categories.find({ order: { position: 'ASC' } });
    if (cats.length === 0) return [];
    // Décompte des savoir-faire actifs par catégorie.
    const rows = await this.knowhow
      .createQueryBuilder('r')
      .select('r.category_id', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('r.status = :status', { status: 'active' })
      .andWhere('r.category_id IS NOT NULL')
      .groupBy('r.category_id')
      .getRawMany<{ categoryId: string; count: string }>();
    const counts = new Map(rows.map((r) => [r.categoryId, Number(r.count)]));
    return cats.map((c) => ({ ...this.catResponse(c), knowhowCount: counts.get(c.id) ?? 0 }));
  }

  async createCategory(input: CategoryInput) {
    const name = this.validateCategoryName(input.name);
    const nameKey = this.normalizeKey(name);
    const existing = await this.categories.findOne({ where: { nameKey } });
    if (existing) throw new ConflictException('Une catégorie porte déjà ce nom.');

    const maxPos = await this.maxCategoryPosition();
    const saved = await this.categories.save(
      this.categories.create({
        name,
        nameKey,
        icon: (input.icon ?? '').slice(0, 16),
        color: (input.color ?? '').slice(0, 16),
        isDefault: false,
        position: maxPos + 1,
      }),
    );
    return this.catResponse(saved);
  }

  async updateCategory(id: string, input: CategoryInput) {
    const cat = await this.getCategoryOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateCategoryName(input.name);
      const nameKey = this.normalizeKey(name);
      const clash = await this.categories.findOne({ where: { nameKey } });
      if (clash && clash.id !== id) {
        throw new ConflictException('Une catégorie porte déjà ce nom.');
      }
      cat.name = name;
      cat.nameKey = nameKey;
    }
    if (input.icon !== undefined) cat.icon = (input.icon ?? '').slice(0, 16);
    if (input.color !== undefined) cat.color = (input.color ?? '').slice(0, 16);
    return this.catResponse(await this.categories.save(cat));
  }

  /** Supprime une catégorie : les savoir-faire rattachés repassent « sans
   *  catégorie », ils ne sont jamais supprimés (RG-04). */
  async removeCategory(id: string): Promise<void> {
    await this.getCategoryOrThrow(id);
    await this.knowhow.update({ categoryId: id }, { categoryId: null });
    await this.categories.delete(id);
  }

  async reorderCategories(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(
      ids.map((id, index) => this.categories.update(id, { position: index })),
    );
    return this.listCategories();
  }

  // ---------------------------------------------------------------------------
  // Savoir-faire — lecture
  // ---------------------------------------------------------------------------

  /** Liste les savoir-faire (actifs par défaut), épinglés d'abord (RG-06). */
  async list(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'active' as const };
    const items = await this.knowhow.find({
      where,
      order: { pinned: 'DESC', position: 'ASC', updatedAt: 'DESC' },
    });
    return items.map((r) => this.toResponse(r));
  }

  async get(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  // ---------------------------------------------------------------------------
  // Savoir-faire — écriture
  // ---------------------------------------------------------------------------

  async create(input: KnowHowInput) {
    const title = this.validateTitle(input.title);
    await this.assertCategoryExists(input.categoryId);
    const now = new Date();
    const maxPos = await this.maxKnowHowPosition();

    const item = this.knowhow.create({
      title,
      goal: this.normalizeText(input.goal, 2000),
      categoryId: input.categoryId ?? null,
      labels: this.normalizeLabels(input.labels),
      components: this.normalizeComponents(input.components),
      steps: this.normalizeSteps(input.steps),
      yieldText: this.normalizeText(input.yieldText, 80),
      yieldBase: this.normalizeNumber(input.yieldBase),
      totalTimeMin: this.normalizeInt(input.totalTimeMin),
      color: (input.color ?? '').slice(0, 16),
      pinned: false,
      position: maxPos + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return this.toResponse(await this.knowhow.save(item));
  }

  /** Édition de contenu : bumpe `updatedAt` (RG-08). */
  async update(id: string, input: KnowHowInput) {
    const item = await this.getOrThrow(id);
    if (input.title !== undefined) item.title = this.validateTitle(input.title);
    if (input.goal !== undefined) item.goal = this.normalizeText(input.goal, 2000);
    if (input.categoryId !== undefined) {
      await this.assertCategoryExists(input.categoryId);
      item.categoryId = input.categoryId ?? null;
    }
    if (input.labels !== undefined) item.labels = this.normalizeLabels(input.labels);
    if (input.components !== undefined) {
      item.components = this.normalizeComponents(input.components);
    }
    if (input.steps !== undefined) item.steps = this.normalizeSteps(input.steps);
    if (input.yieldText !== undefined) {
      item.yieldText = this.normalizeText(input.yieldText, 80);
    }
    if (input.yieldBase !== undefined) item.yieldBase = this.normalizeNumber(input.yieldBase);
    if (input.totalTimeMin !== undefined) {
      item.totalTimeMin = this.normalizeInt(input.totalTimeMin);
    }
    if (input.color !== undefined) item.color = (input.color ?? '').slice(0, 16);
    item.updatedAt = new Date();
    return this.toResponse(await this.knowhow.save(item));
  }

  /** Duplique un savoir-faire : copie complète, non épinglée, en fin de liste (RG-14). */
  async duplicate(id: string) {
    const src = await this.getOrThrow(id);
    const now = new Date();
    const maxPos = await this.maxKnowHowPosition();
    const copy = this.knowhow.create({
      title: `${src.title} (copie)`.slice(0, TITLE_MAX),
      goal: src.goal,
      categoryId: src.categoryId,
      labels: [...src.labels],
      components: src.components.map((c) => ({ ...c, id: randomUUID() })),
      steps: src.steps.map((s) => ({ ...s, id: randomUUID() })),
      yieldText: src.yieldText,
      yieldBase: src.yieldBase,
      totalTimeMin: src.totalTimeMin,
      color: src.color,
      pinned: false,
      position: maxPos + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return this.toResponse(await this.knowhow.save(copy));
  }

  /** Épingler / désépingler : ne touche pas `updatedAt` (RG-08). */
  async setPinned(id: string, pinned: boolean) {
    await this.getOrThrow(id);
    await this.knowhow.update(id, { pinned });
    return this.get(id);
  }

  async archive(id: string) {
    await this.getOrThrow(id);
    await this.knowhow.update(id, { status: 'archived' });
    return this.get(id);
  }

  async unarchive(id: string) {
    await this.getOrThrow(id);
    await this.knowhow.update(id, { status: 'active' });
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.knowhow.delete(id);
  }

  async reorder(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(
      ids.map((id, index) => this.knowhow.update(id, { position: index })),
    );
    return this.list();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toResponse(r: KnowHowEntity) {
    return {
      id: r.id,
      title: r.title,
      goal: r.goal,
      categoryId: r.categoryId,
      labels: r.labels ?? [],
      components: r.components ?? [],
      steps: r.steps ?? [],
      yieldText: r.yieldText,
      yieldBase: r.yieldBase,
      totalTimeMin: r.totalTimeMin,
      color: r.color,
      pinned: r.pinned,
      position: r.position,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private catResponse(c: KnowHowCategoryEntity) {
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
      position: c.position,
    };
  }

  private async getOrThrow(id: string): Promise<KnowHowEntity> {
    const item = await this.knowhow.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Savoir-faire introuvable.');
    return item;
  }

  private async getCategoryOrThrow(id: string): Promise<KnowHowCategoryEntity> {
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie introuvable.');
    return cat;
  }

  private async assertCategoryExists(id?: string | null): Promise<void> {
    if (!id) return;
    const cat = await this.categories.findOne({ where: { id } });
    if (!cat) throw new BadRequestException('Catégorie inconnue.');
  }

  private validateTitle(title?: string): string {
    const trimmed = (title ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le titre est obligatoire.');
    if (trimmed.length > TITLE_MAX) {
      throw new BadRequestException(`Le titre ne peut dépasser ${TITLE_MAX} caractères.`);
    }
    return trimmed;
  }

  private validateCategoryName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > CATEGORY_NAME_MAX) {
      throw new BadRequestException(
        `Le nom ne peut dépasser ${CATEGORY_NAME_MAX} caractères.`,
      );
    }
    return trimmed;
  }

  /** Labels : trim, suppression des vides, dédoublonnage insensible casse (RG-08). */
  private normalizeLabels(labels?: string[]): string[] {
    if (!Array.isArray(labels)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of labels) {
      const label = String(raw ?? '').trim().slice(0, 40);
      if (!label) continue;
      const key = this.normalizeKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
    return out;
  }

  /** Composants : ignore les lignes sans intitulé, (ré)assigne un id stable (RG-02). */
  private normalizeComponents(input?: ComponentInput[]): KnowHowComponent[] {
    if (!Array.isArray(input)) return [];
    const out: KnowHowComponent[] = [];
    for (const c of input) {
      const label = String(c?.label ?? '').trim().slice(0, 200);
      if (!label) continue;
      out.push({
        id: c?.id || randomUUID(),
        quantity: this.normalizeNumber(c?.quantity),
        unit: this.normalizeText(c?.unit, 24),
        label,
        note: this.normalizeText(c?.note, 200),
      });
    }
    return out;
  }

  /** Étapes : ignore les vides, (ré)assigne un id stable (RG-02). */
  private normalizeSteps(input?: StepInput[]): KnowHowStep[] {
    if (!Array.isArray(input)) return [];
    const out: KnowHowStep[] = [];
    for (const s of input) {
      const text = String(s?.text ?? '').trim().slice(0, 2000);
      if (!text) continue;
      out.push({ id: s?.id || randomUUID(), text });
    }
    return out;
  }

  private normalizeText(value?: string | null, max = 200): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed.slice(0, max) : null;
  }

  private normalizeNumber(value?: number | null): number | null {
    if (value === null || value === undefined || (value as unknown) === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 1000) / 1000;
  }

  private normalizeInt(value?: number | null): number | null {
    const n = this.normalizeNumber(value);
    return n === null ? null : Math.round(n);
  }

  private async maxKnowHowPosition(): Promise<number> {
    const row = await this.knowhow
      .createQueryBuilder('r')
      .select('MAX(r.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async maxCategoryPosition(): Promise<number> {
    const row = await this.categories
      .createQueryBuilder('c')
      .select('MAX(c.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  /** Clé d'unicité : sans accents, espaces normalisés, minuscule. */
  private normalizeKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
