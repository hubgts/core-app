import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { applyReorder } from '../common/reorder.util';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { round2 } from '../common/round.util';
import { RecipeEntity } from '../alimentation/entities/recipe.entity';
import { AisleEntity } from './entities/aisle.entity';
import { ArticleEntity } from './entities/article.entity';
import {
  ShoppingItem,
  ShoppingListEntity,
} from './entities/shopping-list.entity';
import {
  ShoppingTemplateEntity,
  TemplateItem,
} from './entities/shopping-template.entity';
import {
  AisleInput,
  ArticleInput,
  DEFAULT_AISLES,
  DEFAULT_ARTICLES,
  ImportRecipeInput,
  ShoppingItemInput,
  ShoppingListInput,
  ShoppingTemplateInput,
} from './types';

const TITLE_MAX = 120;
const AISLE_NAME_MAX = 40;
const ARTICLE_NAME_MAX = 60;
const UNIT_MAX = 24;

/**
 * Tri automatique des items par rayon : d'abord la position du rayon dans le
 * référentiel (ordre de parcours en magasin), puis l'intitulé de l'article par
 * ordre alphabétique. Les items « sans rayon » (Autre) finissent en dernier.
 */
function byAisleThenLabel(
  a: { aisleOrder: number; label: string },
  b: { aisleOrder: number; label: string },
): number {
  if (a.aisleOrder !== b.aisleOrder) return a.aisleOrder - b.aisleOrder;
  return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
}

@Injectable()
export class CourseService implements OnModuleInit {
  constructor(
    @InjectRepository(AisleEntity)
    private readonly aisles: Repository<AisleEntity>,
    @InjectRepository(ArticleEntity)
    private readonly articles: Repository<ArticleEntity>,
    @InjectRepository(ShoppingListEntity)
    private readonly lists: Repository<ShoppingListEntity>,
    @InjectRepository(ShoppingTemplateEntity)
    private readonly templates: Repository<ShoppingTemplateEntity>,
    @InjectRepository(RecipeEntity)
    private readonly recipes: Repository<RecipeEntity>,
  ) {}

  /** Amorce les rayons et quelques articles par défaut au premier démarrage. */
  async onModuleInit(): Promise<void> {
    if ((await this.aisles.count()) === 0) {
      await this.aisles.save(
        DEFAULT_AISLES.map((a, i) =>
          this.aisles.create({
            name: a.name,
            nameKey: this.normalizeKey(a.name),
            icon: a.icon,
            color: a.color,
            isDefault: true,
            position: i,
          }),
        ),
      );
    }
    if ((await this.articles.count()) === 0) {
      const aisles = await this.aisles.find();
      const byName = new Map(aisles.map((a) => [a.nameKey, a.id]));
      await this.articles.save(
        DEFAULT_ARTICLES.map((a, i) =>
          this.articles.create({
            name: a.name,
            nameKey: this.normalizeKey(a.name),
            unit: a.unit,
            aisleId: byName.get(this.normalizeKey(a.aisle)) ?? null,
            isDefault: true,
            position: i,
          }),
        ),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Rayons
  // ---------------------------------------------------------------------------

  async listAisles() {
    const aisles = await this.aisles.find({ order: { position: 'ASC' } });
    if (aisles.length === 0) return [];
    const rows = await this.articles
      .createQueryBuilder('a')
      .select('a.aisle_id', 'aisleId')
      .addSelect('COUNT(*)', 'count')
      .where('a.aisle_id IS NOT NULL')
      .groupBy('a.aisle_id')
      .getRawMany<{ aisleId: string; count: string }>();
    const counts = new Map(rows.map((r) => [r.aisleId, Number(r.count)]));
    return aisles.map((a) => ({
      ...this.aisleResponse(a),
      articleCount: counts.get(a.id) ?? 0,
    }));
  }

  async createAisle(input: AisleInput) {
    const name = this.validateName(input.name, AISLE_NAME_MAX, 'Le nom');
    const nameKey = this.normalizeKey(name);
    if (await this.aisles.findOne({ where: { nameKey } })) {
      throw new ConflictException('Un rayon porte déjà ce nom.');
    }
    const maxPos = await this.maxPosition(this.aisles);
    const saved = await this.aisles.save(
      this.aisles.create({
        name,
        nameKey,
        icon: (input.icon ?? '').slice(0, 16),
        color: (input.color ?? '').slice(0, 16),
        isDefault: false,
        position: maxPos + 1,
      }),
    );
    return this.aisleResponse(saved);
  }

  async updateAisle(id: string, input: AisleInput) {
    const aisle = await this.getAisleOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateName(input.name, AISLE_NAME_MAX, 'Le nom');
      const nameKey = this.normalizeKey(name);
      const clash = await this.aisles.findOne({ where: { nameKey } });
      if (clash && clash.id !== id) {
        throw new ConflictException('Un rayon porte déjà ce nom.');
      }
      aisle.name = name;
      aisle.nameKey = nameKey;
    }
    if (input.icon !== undefined) aisle.icon = (input.icon ?? '').slice(0, 16);
    if (input.color !== undefined)
      aisle.color = (input.color ?? '').slice(0, 16);
    return this.aisleResponse(await this.aisles.save(aisle));
  }

  /** Supprime un rayon : les articles rattachés repassent « Autre » (RG-05). */
  async removeAisle(id: string): Promise<void> {
    await this.getAisleOrThrow(id);
    await this.articles.update({ aisleId: id }, { aisleId: null });
    await this.aisles.delete(id);
  }

  async reorderAisles(ids: string[]) {
    await applyReorder(this.aisles, ids);
    return this.listAisles();
  }

  // ---------------------------------------------------------------------------
  // Articles
  // ---------------------------------------------------------------------------

  async listArticles(q?: string) {
    const qb = this.articles
      .createQueryBuilder('a')
      .orderBy('a.name', 'ASC')
      .limit(200);
    if (q && q.trim()) {
      qb.where('a.name_key LIKE :q', { q: `%${this.normalizeKey(q)}%` });
    }
    const rows = await qb.getMany();
    return rows.map((a) => this.articleResponse(a));
  }

  async createArticle(input: ArticleInput) {
    const name = this.validateName(
      input.name,
      ARTICLE_NAME_MAX,
      "Le nom de l'article",
    );
    const nameKey = this.normalizeKey(name);
    if (await this.articles.findOne({ where: { nameKey } })) {
      throw new ConflictException('Un article porte déjà ce nom.');
    }
    await this.assertAisleExists(input.aisleId);
    const maxPos = await this.maxPosition(this.articles);
    const saved = await this.articles.save(
      this.articles.create({
        name,
        nameKey,
        unit: (input.unit ?? '').trim().slice(0, UNIT_MAX),
        aisleId: input.aisleId ?? null,
        isDefault: false,
        position: maxPos + 1,
      }),
    );
    return this.articleResponse(saved);
  }

  async updateArticle(id: string, input: ArticleInput) {
    const article = await this.getArticleOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateName(
        input.name,
        ARTICLE_NAME_MAX,
        "Le nom de l'article",
      );
      const nameKey = this.normalizeKey(name);
      const clash = await this.articles.findOne({ where: { nameKey } });
      if (clash && clash.id !== id) {
        throw new ConflictException('Un article porte déjà ce nom.');
      }
      article.name = name;
      article.nameKey = nameKey;
    }
    if (input.unit !== undefined) {
      article.unit = (input.unit ?? '').trim().slice(0, UNIT_MAX);
    }
    if (input.aisleId !== undefined) {
      await this.assertAisleExists(input.aisleId);
      article.aisleId = input.aisleId ?? null;
    }
    return this.articleResponse(await this.articles.save(article));
  }

  /** Supprime un article : refusé tant qu'il est référencé par une liste ou un
   *  modèle (RG, §9.1). On propose plutôt de le renommer. */
  async removeArticle(id: string): Promise<void> {
    await this.getArticleOrThrow(id);
    const usage = await this.countArticleUsage(id);
    if (usage > 0) {
      throw new ConflictException(
        `Article utilisé dans ${usage} liste(s)/modèle(s) : renomme-le plutôt que de le supprimer.`,
      );
    }
    await this.articles.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Listes — lecture
  // ---------------------------------------------------------------------------

  /** Liste toutes les listes, ordre manuel puis dernière mise à jour. */
  async listLists() {
    const all = await this.lists.find({
      order: { position: 'ASC', updatedAt: 'DESC' },
    });
    const ctx = await this.buildContext();
    return all.map((l) => this.listSummary(l, ctx));
  }

  async getList(id: string) {
    const list = await this.getListOrThrow(id);
    return this.listDetail(list, await this.buildContext());
  }

  // ---------------------------------------------------------------------------
  // Listes — écriture
  // ---------------------------------------------------------------------------

  async createList(input: ShoppingListInput) {
    const title = this.validateName(input.title, TITLE_MAX, 'Le titre');
    const now = new Date();
    const maxPos = await this.maxPosition(this.lists);
    const saved = await this.lists.save(
      this.lists.create({
        title,
        date: this.normalizeDate(input.date),
        items: [],
        position: maxPos + 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.listDetail(saved, await this.buildContext());
  }

  /** Met à jour le titre et/ou la date d'une liste. */
  async updateList(id: string, input: ShoppingListInput) {
    const list = await this.getListOrThrow(id);
    if (input.title !== undefined) {
      list.title = this.validateName(input.title, TITLE_MAX, 'Le titre');
    }
    if (input.date !== undefined) list.date = this.normalizeDate(input.date);
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  /** Duplique une liste : items copiés, cochage remis à zéro (RG-13). */
  async duplicateList(id: string) {
    const src = await this.getListOrThrow(id);
    const now = new Date();
    const maxPos = await this.maxPosition(this.lists);
    const copy = this.lists.create({
      title: `${src.title} (copie)`.slice(0, TITLE_MAX),
      date: src.date,
      items: src.items.map((i) => ({ ...i, id: randomUUID(), checked: false })),
      position: maxPos + 1,
      createdAt: now,
      updatedAt: now,
    });
    return this.listDetail(
      await this.lists.save(copy),
      await this.buildContext(),
    );
  }

  async removeList(id: string): Promise<void> {
    await this.getListOrThrow(id);
    await this.lists.delete(id);
  }

  async reorderLists(ids: string[]) {
    await applyReorder(this.lists, ids);
    return this.listLists();
  }

  // ---------------------------------------------------------------------------
  // Items d'une liste
  // ---------------------------------------------------------------------------

  /** Ajoute un item (résolution/création d'article + agrégation, RG-07/17). */
  async addItem(listId: string, input: ShoppingItemInput) {
    const list = await this.getListOrThrow(listId);
    const article = await this.resolveArticle(input);
    this.mergeItem(list.items, this.buildItem(article, input));
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  async updateItem(listId: string, itemId: string, input: ShoppingItemInput) {
    const list = await this.getListOrThrow(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item introuvable.');
    if (input.articleId !== undefined && input.articleId) {
      await this.getArticleOrThrow(input.articleId);
      item.articleId = input.articleId;
    } else if (input.articleName) {
      const article = await this.resolveArticleByName(
        input.articleName,
        input.unit ?? null,
      );
      item.articleId = article.id;
    }
    if (input.quantity !== undefined)
      item.quantity = this.normalizeNumber(input.quantity);
    if (input.unit !== undefined) {
      item.unit = this.normalizeText(input.unit, UNIT_MAX);
    }
    if (input.note !== undefined)
      item.note = this.normalizeText(input.note, 200);
    if (input.checked !== undefined) item.checked = !!input.checked;
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  async toggleItem(listId: string, itemId: string) {
    const list = await this.getListOrThrow(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item introuvable.');
    item.checked = !item.checked;
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  async removeItem(listId: string, itemId: string) {
    const list = await this.getListOrThrow(listId);
    list.items = list.items.filter((i) => i.id !== itemId);
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  async reorderItems(listId: string, ids: string[]) {
    const list = await this.getListOrThrow(listId);
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    const order = new Map(ids.map((id, i) => [id, i]));
    list.items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  async uncheckAll(listId: string) {
    const list = await this.getListOrThrow(listId);
    list.items.forEach((i) => (i.checked = false));
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  /** Vide les items cochés (« pris ») de la liste (RG-09). */
  async clearChecked(listId: string) {
    const list = await this.getListOrThrow(listId);
    list.items = list.items.filter((i) => !i.checked);
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  // ---------------------------------------------------------------------------
  // Modèles (listes types)
  // ---------------------------------------------------------------------------

  async listTemplates() {
    const all = await this.templates.find({ order: { position: 'ASC' } });
    const ctx = await this.buildContext();
    return all.map((t) => this.templateResponse(t, ctx));
  }

  async getTemplate(id: string) {
    const t = await this.getTemplateOrThrow(id);
    return this.templateResponse(t, await this.buildContext());
  }

  async createTemplate(input: ShoppingTemplateInput) {
    const title = this.validateName(input.title, TITLE_MAX, 'Le titre');
    const now = new Date();
    const maxPos = await this.maxPosition(this.templates);
    const items = await this.resolveTemplateItems(input.items);
    const saved = await this.templates.save(
      this.templates.create({
        title,
        items,
        position: maxPos + 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.templateResponse(saved, await this.buildContext());
  }

  async updateTemplate(id: string, input: ShoppingTemplateInput) {
    const t = await this.getTemplateOrThrow(id);
    if (input.title !== undefined) {
      t.title = this.validateName(input.title, TITLE_MAX, 'Le titre');
    }
    if (input.items !== undefined) {
      t.items = await this.resolveTemplateItems(input.items);
    }
    t.updatedAt = new Date();
    return this.templateResponse(
      await this.templates.save(t),
      await this.buildContext(),
    );
  }

  async removeTemplate(id: string): Promise<void> {
    await this.getTemplateOrThrow(id);
    await this.templates.delete(id);
  }

  /** Ajoute un item à un modèle (résolution/création d'article, RG-17). */
  async addTemplateItem(templateId: string, input: ShoppingItemInput) {
    const t = await this.getTemplateOrThrow(templateId);
    const article = await this.resolveArticle(input);
    const unit =
      input.unit !== undefined
        ? this.normalizeText(input.unit, UNIT_MAX)
        : article.unit || null;
    t.items.push({
      id: randomUUID(),
      articleId: article.id,
      quantity: this.normalizeNumber(input.quantity),
      unit,
      note: this.normalizeText(input.note, 200),
    });
    t.updatedAt = new Date();
    return this.templateResponse(
      await this.templates.save(t),
      await this.buildContext(),
    );
  }

  /** Modifie un item d'un modèle (article, quantité, mesure, note). */
  async updateTemplateItem(
    templateId: string,
    itemId: string,
    input: ShoppingItemInput,
  ) {
    const t = await this.getTemplateOrThrow(templateId);
    const item = t.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item introuvable.');
    if (input.articleId !== undefined && input.articleId) {
      await this.getArticleOrThrow(input.articleId);
      item.articleId = input.articleId;
    } else if (input.articleName) {
      const article = await this.resolveArticleByName(
        input.articleName,
        input.unit ?? null,
      );
      item.articleId = article.id;
    }
    if (input.quantity !== undefined)
      item.quantity = this.normalizeNumber(input.quantity);
    if (input.unit !== undefined)
      item.unit = this.normalizeText(input.unit, UNIT_MAX);
    if (input.note !== undefined)
      item.note = this.normalizeText(input.note, 200);
    t.updatedAt = new Date();
    return this.templateResponse(
      await this.templates.save(t),
      await this.buildContext(),
    );
  }

  async removeTemplateItem(templateId: string, itemId: string) {
    const t = await this.getTemplateOrThrow(templateId);
    t.items = t.items.filter((i) => i.id !== itemId);
    t.updatedAt = new Date();
    return this.templateResponse(
      await this.templates.save(t),
      await this.buildContext(),
    );
  }

  /** Crée une liste à partir d'un modèle : copie figée, décochée (RG-06). */
  async instantiateTemplate(templateId: string, input: ShoppingListInput) {
    const t = await this.getTemplateOrThrow(templateId);
    const title = (input?.title ?? '').trim()
      ? this.validateName(input.title, TITLE_MAX, 'Le titre')
      : `${t.title} — ${this.frenchDate()}`.slice(0, TITLE_MAX);
    const now = new Date();
    const maxPos = await this.maxPosition(this.lists);
    const saved = await this.lists.save(
      this.lists.create({
        title,
        items: t.items.map((i) => ({
          id: randomUUID(),
          articleId: i.articleId,
          quantity: i.quantity,
          unit: i.unit,
          note: i.note,
          checked: false,
          sourceRecipeId: null,
        })),
        date: null,
        position: maxPos + 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.listDetail(saved, await this.buildContext());
  }

  /** Applique un modèle à une liste existante (ajout + agrégation, RG-07). */
  async applyTemplate(listId: string, templateId: string) {
    const list = await this.getListOrThrow(listId);
    const t = await this.getTemplateOrThrow(templateId);
    for (const ti of t.items) {
      this.mergeItem(list.items, {
        id: randomUUID(),
        articleId: ti.articleId,
        quantity: ti.quantity,
        unit: ti.unit,
        note: ti.note,
        checked: false,
        sourceRecipeId: null,
      });
    }
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  /** Enregistre une liste comme modèle : items copiés, cochage ignoré (RG-16). */
  async saveListAsTemplate(listId: string, input: ShoppingTemplateInput) {
    const list = await this.getListOrThrow(listId);
    const title = (input?.title ?? '').trim()
      ? this.validateName(input.title, TITLE_MAX, 'Le titre')
      : list.title;
    const now = new Date();
    const maxPos = await this.maxPosition(this.templates);
    const saved = await this.templates.save(
      this.templates.create({
        title,
        items: list.items.map((i) => ({
          id: randomUUID(),
          articleId: i.articleId,
          quantity: i.quantity,
          unit: i.unit,
          note: i.note,
        })),
        position: maxPos + 1,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.templateResponse(saved, await this.buildContext());
  }

  // ---------------------------------------------------------------------------
  // Import depuis une recette (Alimentation)
  // ---------------------------------------------------------------------------

  /** Aperçu mis à l'échelle des ingrédients d'une recette (RG-12/18). */
  async previewRecipe(recipeId: string, servings?: number | null) {
    const recipe = await this.recipes.findOne({ where: { id: recipeId } });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    const factor = this.scaleFactor(recipe.servings, servings);
    const articles = await this.articles.find();
    const byKey = new Map(articles.map((a) => [a.nameKey, a]));
    const items = (recipe.ingredients ?? []).map((ing) => {
      const match = byKey.get(this.normalizeKey(ing.label));
      return {
        label: ing.label,
        quantity: ing.quantity == null ? null : round2(ing.quantity * factor),
        unit: ing.unit ?? match?.unit ?? null,
        articleId: match?.id ?? null,
        articleExists: !!match,
        aisleId: match?.aisleId ?? null,
        // proposé décoché si pas de quantité (souvent déjà au placard)
        selected: ing.quantity != null,
      };
    });
    return {
      recipe: { id: recipe.id, title: recipe.title, servings: recipe.servings },
      servings: servings ?? recipe.servings ?? null,
      factor,
      items,
    };
  }

  /** Importe une recette dans une liste existante (RG-07/12/18). */
  async importRecipeIntoList(listId: string, input: ImportRecipeInput) {
    const list = await this.getListOrThrow(listId);
    const added = await this.recipeItems(input);
    for (const it of added) this.mergeItem(list.items, it);
    list.updatedAt = new Date();
    return this.listDetail(
      await this.lists.save(list),
      await this.buildContext(),
    );
  }

  /** Crée une nouvelle liste à partir d'une recette (RG-12/18). */
  async createListFromRecipe(input: ImportRecipeInput) {
    const recipe = await this.recipes.findOne({
      where: { id: input.recipeId ?? '' },
    });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    const title = (input?.title ?? '').trim()
      ? this.validateName(input.title, TITLE_MAX, 'Le titre')
      : recipe.title.slice(0, TITLE_MAX);
    const created = await this.createList({ title });
    return this.importRecipeIntoList(created.id, input);
  }

  // ---------------------------------------------------------------------------
  // Helpers — import recette
  // ---------------------------------------------------------------------------

  /** Construit les items à insérer depuis une recette (création d'articles au
   *  besoin, mise à l'échelle, ingrédients sans quantité inclus). */
  private async recipeItems(input: ImportRecipeInput): Promise<ShoppingItem[]> {
    const recipe = await this.recipes.findOne({
      where: { id: input.recipeId ?? '' },
    });
    if (!recipe) throw new NotFoundException('Recette introuvable.');
    const factor = this.scaleFactor(recipe.servings, input.servings);
    const out: ShoppingItem[] = [];
    for (const ing of recipe.ingredients ?? []) {
      const label = (ing.label ?? '').trim();
      if (!label) continue;
      const article = await this.resolveArticleByName(label, ing.unit ?? null);
      out.push({
        id: randomUUID(),
        articleId: article.id,
        quantity: ing.quantity == null ? null : round2(ing.quantity * factor),
        unit: this.normalizeText(ing.unit, UNIT_MAX) ?? article.unit ?? null,
        note: null,
        checked: false,
        sourceRecipeId: recipe.id,
      });
    }
    return out;
  }

  /** Facteur d'échelle : portions cible / portions de référence, sinon 1. */
  private scaleFactor(
    reference: number | null,
    target?: number | null,
  ): number {
    if (target == null || reference == null || reference <= 0) return 1;
    const f = Number(target) / reference;
    return Number.isFinite(f) && f > 0 ? f : 1;
  }

  // ---------------------------------------------------------------------------
  // Helpers — items & articles
  // ---------------------------------------------------------------------------

  /** Résout l'article d'un input (id prioritaire, sinon nom → création RG-17). */
  private async resolveArticle(
    input: ShoppingItemInput,
  ): Promise<ArticleEntity> {
    if (input.articleId) return this.getArticleOrThrow(input.articleId);
    const name = (input.articleName ?? '').trim();
    if (!name) throw new BadRequestException('Un article est obligatoire.');
    return this.resolveArticleByName(name, input.unit ?? null);
  }

  /** Trouve un article par nom (insensible casse/accents) ou le crée (RG-17/18). */
  private async resolveArticleByName(
    name: string,
    unit: string | null,
  ): Promise<ArticleEntity> {
    const clean = name.trim().slice(0, ARTICLE_NAME_MAX);
    const nameKey = this.normalizeKey(clean);
    const existing = await this.articles.findOne({ where: { nameKey } });
    if (existing) return existing;
    const maxPos = await this.maxPosition(this.articles);
    return this.articles.save(
      this.articles.create({
        name: clean,
        nameKey,
        unit: (unit ?? '').trim().slice(0, UNIT_MAX),
        aisleId: null,
        isDefault: false,
        position: maxPos + 1,
      }),
    );
  }

  private buildItem(
    article: ArticleEntity,
    input: ShoppingItemInput,
  ): ShoppingItem {
    const unit =
      input.unit !== undefined
        ? this.normalizeText(input.unit, UNIT_MAX)
        : article.unit || null;
    return {
      id: randomUUID(),
      articleId: article.id,
      quantity: this.normalizeNumber(input.quantity),
      unit,
      note: this.normalizeText(input.note, 200),
      checked: false,
      sourceRecipeId: input.sourceRecipeId ?? null,
    };
  }

  /**
   * Agrège un item entrant dans la liste (RG-07) : même article + même mesure
   * → cumul des quantités (item existant repasse décoché). Sinon ajout.
   */
  private mergeItem(items: ShoppingItem[], incoming: ShoppingItem): void {
    const existing = items.find(
      (i) =>
        i.articleId === incoming.articleId &&
        (i.unit ?? '') === (incoming.unit ?? ''),
    );
    if (!existing) {
      items.push(incoming);
      return;
    }
    if (existing.quantity == null) {
      existing.quantity = incoming.quantity;
    } else if (incoming.quantity != null) {
      existing.quantity = round2(existing.quantity + incoming.quantity);
    }
    if (incoming.quantity != null) existing.checked = false;
  }

  private async resolveTemplateItems(
    input?: ShoppingItemInput[],
  ): Promise<TemplateItem[]> {
    if (!Array.isArray(input)) return [];
    const out: TemplateItem[] = [];
    for (const i of input) {
      let article: ArticleEntity;
      try {
        article = await this.resolveArticle(i);
      } catch {
        continue; // ligne sans article valide → ignorée (RG-02)
      }
      const unit =
        i.unit !== undefined
          ? this.normalizeText(i.unit, UNIT_MAX)
          : article.unit || null;
      out.push({
        id: i.id || randomUUID(),
        articleId: article.id,
        quantity: this.normalizeNumber(i.quantity),
        unit,
        note: this.normalizeText(i.note, 200),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Helpers — réponses & contexte
  // ---------------------------------------------------------------------------

  /** Contexte de rendu : index des articles et rayons pour enrichir les items. */
  private async buildContext() {
    const [articles, aisles] = await Promise.all([
      this.articles.find(),
      this.aisles.find({ order: { position: 'ASC' } }),
    ]);
    return {
      articleById: new Map(articles.map((a) => [a.id, a])),
      aisleById: new Map(aisles.map((a) => [a.id, a])),
      aisleOrder: new Map(aisles.map((a, i) => [a.id, i])),
    };
  }

  private decorateItem(
    item: ShoppingItem,
    ctx: Awaited<ReturnType<typeof this.buildContext>>,
  ) {
    const article = ctx.articleById.get(item.articleId);
    const aisle = article?.aisleId ? ctx.aisleById.get(article.aisleId) : null;
    return {
      id: item.id,
      articleId: item.articleId,
      label: article?.name ?? '(article supprimé)',
      quantity: item.quantity,
      unit: item.unit,
      note: item.note,
      checked: item.checked,
      sourceRecipeId: item.sourceRecipeId,
      aisleId: article?.aisleId ?? null,
      aisleName: aisle?.name ?? 'Autre',
      aisleIcon: aisle?.icon ?? '📦',
      aisleOrder: aisle ? (ctx.aisleOrder.get(aisle.id) ?? 999) : 999,
    };
  }

  private listSummary(
    list: ShoppingListEntity,
    ctx: Awaited<ReturnType<typeof this.buildContext>>,
  ) {
    const itemCount = list.items.length;
    const checkedCount = list.items.filter((i) => i.checked).length;
    return {
      id: list.id,
      title: list.title,
      date: list.date ?? null,
      position: list.position,
      itemCount,
      checkedCount,
      remainingCount: itemCount - checkedCount,
      hasImported: list.items.some((i) => i.sourceRecipeId),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  private listDetail(
    list: ShoppingListEntity,
    ctx: Awaited<ReturnType<typeof this.buildContext>>,
  ) {
    const items = list.items
      .map((i) => this.decorateItem(i, ctx))
      .sort(byAisleThenLabel);
    return { ...this.listSummary(list, ctx), items };
  }

  private templateResponse(
    t: ShoppingTemplateEntity,
    ctx: Awaited<ReturnType<typeof this.buildContext>>,
  ) {
    return {
      id: t.id,
      title: t.title,
      position: t.position,
      itemCount: t.items.length,
      items: t.items
        .map((i) => {
          const article = ctx.articleById.get(i.articleId);
          const aisle = article?.aisleId
            ? ctx.aisleById.get(article.aisleId)
            : null;
          return {
            id: i.id,
            articleId: i.articleId,
            label: article?.name ?? '(article supprimé)',
            quantity: i.quantity,
            unit: i.unit,
            note: i.note,
            aisleId: article?.aisleId ?? null,
            aisleName: aisle?.name ?? 'Autre',
            aisleOrder: aisle ? (ctx.aisleOrder.get(aisle.id) ?? 999) : 999,
          };
        })
        .sort(byAisleThenLabel),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private aisleResponse(a: AisleEntity) {
    return {
      id: a.id,
      name: a.name,
      icon: a.icon,
      color: a.color,
      isDefault: a.isDefault,
      position: a.position,
    };
  }

  private articleResponse(a: ArticleEntity) {
    return {
      id: a.id,
      name: a.name,
      unit: a.unit,
      aisleId: a.aisleId,
      isDefault: a.isDefault,
      position: a.position,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers — bas niveau
  // ---------------------------------------------------------------------------

  private async getListOrThrow(id: string): Promise<ShoppingListEntity> {
    const list = await this.lists.findOne({ where: { id } });
    if (!list) throw new NotFoundException('Liste introuvable.');
    if (!Array.isArray(list.items)) list.items = [];
    return list;
  }

  private async getTemplateOrThrow(
    id: string,
  ): Promise<ShoppingTemplateEntity> {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Modèle introuvable.');
    if (!Array.isArray(t.items)) t.items = [];
    return t;
  }

  private async getAisleOrThrow(id: string): Promise<AisleEntity> {
    const a = await this.aisles.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Rayon introuvable.');
    return a;
  }

  private async getArticleOrThrow(id: string): Promise<ArticleEntity> {
    const a = await this.articles.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Article introuvable.');
    return a;
  }

  private async assertAisleExists(id?: string | null): Promise<void> {
    if (!id) return;
    const a = await this.aisles.findOne({ where: { id } });
    if (!a) throw new BadRequestException('Rayon inconnu.');
  }

  private async countArticleUsage(articleId: string): Promise<number> {
    const [lists, templates] = await Promise.all([
      this.lists.find(),
      this.templates.find(),
    ]);
    let n = 0;
    for (const l of lists) {
      if ((l.items ?? []).some((i) => i.articleId === articleId)) n++;
    }
    for (const t of templates) {
      if ((t.items ?? []).some((i) => i.articleId === articleId)) n++;
    }
    return n;
  }

  private validateName(
    value: string | undefined,
    max: number,
    label: string,
  ): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) throw new BadRequestException(`${label} est obligatoire.`);
    if (trimmed.length > max) {
      throw new BadRequestException(
        `${label} ne peut dépasser ${max} caractères.`,
      );
    }
    return trimmed;
  }

  private normalizeText(value?: string | null, max = 200): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed.slice(0, max) : null;
  }

  /** Valide une date `YYYY-MM-DD` ; null si vide. Rejette un format invalide. */
  private normalizeDate(value?: string | null): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(
        'Date invalide (format attendu AAAA-MM-JJ).',
      );
    }
    return trimmed;
  }

  private normalizeNumber(value?: number | null): number | null {
    if (value === null || value === undefined || (value as unknown) === '')
      return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return round2(n);
  }

  private async maxPosition(
    repo: Repository<{ position: number }>,
  ): Promise<number> {
    const row = await repo
      .createQueryBuilder('e')
      .select('MAX(e.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private frenchDate(): string {
    return new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
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
