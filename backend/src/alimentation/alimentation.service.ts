import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  RecipeEntity,
  RecipeIngredient,
  RecipeStep,
} from './entities/recipe.entity';
import { MealTypeEntity } from './entities/meal-type.entity';
import { FoodEntity, FoodUnit } from './entities/food.entity';
import {
  DEFAULT_MEAL_TYPES,
  FoodInput,
  IngredientInput,
  MealTypeInput,
  RecipeDifficulty,
  RecipeInput,
  StepInput,
} from './types';
import { round1, round2 } from '../common/round.util';

const TITLE_MAX = 120;
const MEAL_TYPE_NAME_MAX = 40;
const FOOD_NAME_MAX = 80;
const MACRO_MAX = 100; // g pour 100 g/ml
const FOOD_UNITS: FoodUnit[] = ['g', 'ml'];
const DIFFICULTIES: RecipeDifficulty[] = ['facile', 'moyen', 'difficile'];

@Injectable()
export class AlimentationService implements OnModuleInit {
  constructor(
    @InjectRepository(RecipeEntity)
    private readonly recipes: Repository<RecipeEntity>,
    @InjectRepository(MealTypeEntity)
    private readonly mealTypes: Repository<MealTypeEntity>,
    @InjectRepository(FoodEntity)
    private readonly foods: Repository<FoodEntity>,
  ) {}

  /** Amorce le référentiel de types de repas par défaut au premier démarrage. */
  async onModuleInit(): Promise<void> {
    const count = await this.mealTypes.count();
    if (count > 0) return;
    await this.mealTypes.save(
      DEFAULT_MEAL_TYPES.map((t, i) =>
        this.mealTypes.create({
          name: t.name,
          nameKey: this.normalizeKey(t.name),
          icon: t.icon,
          color: t.color,
          isDefault: true,
          position: i,
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Types de repas
  // ---------------------------------------------------------------------------

  async listMealTypes() {
    const types = await this.mealTypes.find({ order: { position: 'ASC' } });
    if (types.length === 0) return [];
    // Décompte des recettes actives par type.
    const rows = await this.recipes
      .createQueryBuilder('r')
      .select('r.meal_type_id', 'mealTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('r.status = :status', { status: 'active' })
      .andWhere('r.meal_type_id IS NOT NULL')
      .groupBy('r.meal_type_id')
      .getRawMany<{ mealTypeId: string; count: string }>();
    const counts = new Map(rows.map((r) => [r.mealTypeId, Number(r.count)]));
    return types.map((t) => ({
      ...this.typeResponse(t),
      recipeCount: counts.get(t.id) ?? 0,
    }));
  }

  async createMealType(input: MealTypeInput) {
    const name = this.validateMealTypeName(input.name);
    const nameKey = this.normalizeKey(name);
    const existing = await this.mealTypes.findOne({ where: { nameKey } });
    if (existing)
      throw new ConflictException('Un type de repas porte déjà ce nom.');

    const maxPos = await this.maxMealTypePosition();
    const saved = await this.mealTypes.save(
      this.mealTypes.create({
        name,
        nameKey,
        icon: (input.icon ?? '').slice(0, 16),
        color: (input.color ?? '').slice(0, 16),
        isDefault: false,
        position: maxPos + 1,
      }),
    );
    return this.typeResponse(saved);
  }

  async updateMealType(id: string, input: MealTypeInput) {
    const type = await this.getMealTypeOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateMealTypeName(input.name);
      const nameKey = this.normalizeKey(name);
      const clash = await this.mealTypes.findOne({ where: { nameKey } });
      if (clash && clash.id !== id) {
        throw new ConflictException('Un type de repas porte déjà ce nom.');
      }
      type.name = name;
      type.nameKey = nameKey;
    }
    if (input.icon !== undefined) type.icon = (input.icon ?? '').slice(0, 16);
    if (input.color !== undefined)
      type.color = (input.color ?? '').slice(0, 16);
    return this.typeResponse(await this.mealTypes.save(type));
  }

  /** Supprime un type : les recettes rattachées repassent « sans type », elles
   *  ne sont jamais supprimées (RG-04). */
  async removeMealType(id: string): Promise<void> {
    await this.getMealTypeOrThrow(id);
    await this.recipes.update({ mealTypeId: id }, { mealTypeId: null });
    await this.mealTypes.delete(id);
  }

  async reorderMealTypes(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(
      ids.map((id, index) => this.mealTypes.update(id, { position: index })),
    );
    return this.listMealTypes();
  }

  // ---------------------------------------------------------------------------
  // Aliments (référentiel nutritionnel)
  // ---------------------------------------------------------------------------

  /** Liste les aliments, filtrés par `q` (recherche libre sur le nom). */
  async listFoods(q?: string) {
    const qb = this.foods
      .createQueryBuilder('f')
      .orderBy('f.name', 'ASC')
      .limit(200);
    if (q && q.trim()) {
      qb.where('f.name_key LIKE :q', { q: `%${this.normalizeKey(q)}%` });
    }
    const rows = await qb.getMany();
    return rows.map((f) => this.foodResponse(f));
  }

  async createFood(input: FoodInput) {
    const name = this.validateFoodName(input.name);
    const nameKey = this.normalizeKey(name);
    const existing = await this.foods.findOne({ where: { nameKey } });
    if (existing) throw new ConflictException('Un aliment porte déjà ce nom.');

    const food = this.foods.create(this.foodFromInput(input, name, nameKey));
    return this.foodResponse(await this.foods.save(food));
  }

  async updateFood(id: string, input: FoodInput) {
    const food = await this.getFoodOrThrow(id);
    let name = food.name;
    let nameKey = food.nameKey;
    if (input.name !== undefined) {
      name = this.validateFoodName(input.name);
      nameKey = this.normalizeKey(name);
      const clash = await this.foods.findOne({ where: { nameKey } });
      if (clash && clash.id !== id) {
        throw new ConflictException('Un aliment porte déjà ce nom.');
      }
    }
    if (input.unit !== undefined) food.unit = this.normalizeUnit(input.unit);
    if (input.carbs !== undefined)
      food.carbs = this.normalizeMacro(input.carbs);
    if (input.protein !== undefined) {
      food.protein = this.normalizeMacro(input.protein);
    }
    if (input.fat !== undefined) food.fat = this.normalizeMacro(input.fat);
    food.name = name;
    food.nameKey = nameKey;
    food.kcal = this.computeKcal(food.carbs, food.protein, food.fat);
    return this.foodResponse(await this.foods.save(food));
  }

  /** Supprime un aliment, sauf s'il est utilisé dans au moins une recette. */
  async removeFood(id: string): Promise<void> {
    await this.getFoodOrThrow(id);
    const used = await this.recipes
      .createQueryBuilder('r')
      .where(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(r.ingredients) ing
                 WHERE ing->>'foodId' = :id)`,
        { id },
      )
      .getCount();
    if (used > 0) {
      throw new ConflictException(
        `Cet aliment est utilisé dans ${used} recette${used > 1 ? 's' : ''}. ` +
          'Retire-le de ces recettes avant de le supprimer.',
      );
    }
    await this.foods.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Recettes — lecture
  // ---------------------------------------------------------------------------

  /** Liste les recettes (actives par défaut), épinglées d'abord (RG-06). */
  async list(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'active' as const };
    const items = await this.recipes.find({
      where,
      order: { pinned: 'DESC', position: 'ASC', updatedAt: 'DESC' },
    });
    const foodMap = await this.loadFoodMap(items.flatMap((r) => r.ingredients));
    return items.map((r) => this.toResponse(r, foodMap));
  }

  async get(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  // ---------------------------------------------------------------------------
  // Recettes — écriture
  // ---------------------------------------------------------------------------

  async create(input: RecipeInput) {
    const title = this.validateTitle(input.title);
    await this.assertMealTypeExists(input.mealTypeId);
    const now = new Date();
    const maxPos = await this.maxRecipePosition();

    const item = this.recipes.create({
      title,
      description: this.normalizeText(input.description, 2000),
      mealTypeId: input.mealTypeId ?? null,
      labels: this.normalizeLabels(input.labels),
      ingredients: this.normalizeIngredients(input.ingredients),
      steps: this.normalizeSteps(input.steps),
      servings: this.normalizeInt(input.servings),
      prepTimeMin: this.normalizeInt(input.prepTimeMin),
      cookTimeMin: this.normalizeInt(input.cookTimeMin),
      restTimeMin: this.normalizeInt(input.restTimeMin),
      difficulty: this.normalizeDifficulty(input.difficulty),
      color: (input.color ?? '').slice(0, 16),
      pinned: false,
      position: maxPos + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return this.toResponse(await this.recipes.save(item));
  }

  /** Édition de contenu : bumpe `updatedAt` (RG-08). */
  async update(id: string, input: RecipeInput) {
    const item = await this.getOrThrow(id);
    if (input.title !== undefined) item.title = this.validateTitle(input.title);
    if (input.description !== undefined) {
      item.description = this.normalizeText(input.description, 2000);
    }
    if (input.mealTypeId !== undefined) {
      await this.assertMealTypeExists(input.mealTypeId);
      item.mealTypeId = input.mealTypeId ?? null;
    }
    if (input.labels !== undefined)
      item.labels = this.normalizeLabels(input.labels);
    if (input.ingredients !== undefined) {
      item.ingredients = this.normalizeIngredients(input.ingredients);
    }
    if (input.steps !== undefined)
      item.steps = this.normalizeSteps(input.steps);
    if (input.servings !== undefined)
      item.servings = this.normalizeInt(input.servings);
    if (input.prepTimeMin !== undefined) {
      item.prepTimeMin = this.normalizeInt(input.prepTimeMin);
    }
    if (input.cookTimeMin !== undefined) {
      item.cookTimeMin = this.normalizeInt(input.cookTimeMin);
    }
    if (input.restTimeMin !== undefined) {
      item.restTimeMin = this.normalizeInt(input.restTimeMin);
    }
    if (input.difficulty !== undefined) {
      item.difficulty = this.normalizeDifficulty(input.difficulty);
    }
    if (input.color !== undefined)
      item.color = (input.color ?? '').slice(0, 16);
    item.updatedAt = new Date();
    return this.toResponse(await this.recipes.save(item));
  }

  /** Duplique une recette : copie complète, non épinglée, en fin de liste (RG-14). */
  async duplicate(id: string) {
    const src = await this.getOrThrow(id);
    const now = new Date();
    const maxPos = await this.maxRecipePosition();
    const copy = this.recipes.create({
      title: `${src.title} (copie)`.slice(0, TITLE_MAX),
      description: src.description,
      mealTypeId: src.mealTypeId,
      labels: [...src.labels],
      ingredients: src.ingredients.map((i) => ({ ...i, id: randomUUID() })),
      steps: src.steps.map((s) => ({ ...s, id: randomUUID() })),
      servings: src.servings,
      prepTimeMin: src.prepTimeMin,
      cookTimeMin: src.cookTimeMin,
      restTimeMin: src.restTimeMin,
      difficulty: src.difficulty,
      color: src.color,
      pinned: false,
      position: maxPos + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return this.toResponse(await this.recipes.save(copy));
  }

  /** Épingler / désépingler : ne touche pas `updatedAt` (RG-08). */
  async setPinned(id: string, pinned: boolean) {
    await this.getOrThrow(id);
    await this.recipes.update(id, { pinned });
    return this.get(id);
  }

  async archive(id: string) {
    await this.getOrThrow(id);
    await this.recipes.update(id, { status: 'archived' });
    return this.get(id);
  }

  async unarchive(id: string) {
    await this.getOrThrow(id);
    await this.recipes.update(id, { status: 'active' });
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.recipes.delete(id);
  }

  async reorder(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(
      ids.map((id, index) => this.recipes.update(id, { position: index })),
    );
    return this.list();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Somme des temps renseignés ; null si aucun (RG-17). */
  private computeTotalTime(r: RecipeEntity): number | null {
    const parts = [r.prepTimeMin, r.cookTimeMin, r.restTimeMin].filter(
      (v): v is number => v != null,
    );
    if (parts.length === 0) return null;
    return parts.reduce((a, b) => a + b, 0);
  }

  private async toResponse(r: RecipeEntity, foodMap?: Map<string, FoodEntity>) {
    const ingredients = r.ingredients ?? [];
    const map = foodMap ?? (await this.loadFoodMap(ingredients));
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      mealTypeId: r.mealTypeId,
      labels: r.labels ?? [],
      ingredients,
      steps: r.steps ?? [],
      servings: r.servings,
      prepTimeMin: r.prepTimeMin,
      cookTimeMin: r.cookTimeMin,
      restTimeMin: r.restTimeMin,
      totalTimeMin: this.computeTotalTime(r),
      difficulty: r.difficulty,
      color: r.color,
      pinned: r.pinned,
      position: r.position,
      status: r.status,
      nutrition: this.computeNutrition(r, map),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Apport nutritionnel d'une recette (RG-nutri). Pour chaque ingrédient lié à
   * un aliment et quantifié en g/ml, agrège quantité × (macro/100). Les lignes
   * sans aliment, sans quantité ou en unité non massique sont ignorées et
   * comptées dans `incompleteCount`. `perServing` est null si `servings` absent.
   */
  private computeNutrition(r: RecipeEntity, foodMap: Map<string, FoodEntity>) {
    let carbs = 0;
    let protein = 0;
    let fat = 0;
    let kcal = 0;
    let counted = 0;
    let incompleteCount = 0;

    for (const ing of r.ingredients ?? []) {
      const food = ing.foodId ? foodMap.get(ing.foodId) : undefined;
      const usable =
        food &&
        ing.quantity != null &&
        ing.quantity > 0 &&
        this.unitMatches(ing.unit, food.unit);
      if (!usable) {
        // Les lignes de section (sans aliment ni quantité) ne comptent pas.
        if (ing.foodId || ing.quantity != null) incompleteCount += 1;
        continue;
      }
      const factor = (ing.quantity as number) / 100;
      carbs += Number(food.carbs) * factor;
      protein += Number(food.protein) * factor;
      fat += Number(food.fat) * factor;
      kcal += Number(food.kcal) * factor;
      counted += 1;
    }

    const total = {
      carbs: round1(carbs),
      protein: round1(protein),
      fat: round1(fat),
      kcal: Math.round(kcal),
    };
    const servings = r.servings;
    const perServing =
      servings != null && servings > 0
        ? {
            carbs: round1(carbs / servings),
            protein: round1(protein / servings),
            fat: round1(fat / servings),
            kcal: Math.round(kcal / servings),
          }
        : null;

    return { ...total, perServing, countedCount: counted, incompleteCount };
  }

  /** L'ingrédient entre dans le calcul si son unité correspond à celle de
   *  l'aliment (g↔g, ml↔ml), comparaison insensible casse/espaces. */
  private unitMatches(ingUnit: string | null, foodUnit: FoodUnit): boolean {
    const u = (ingUnit ?? '').trim().toLowerCase();
    return u === foodUnit;
  }

  /** Charge en une requête les aliments référencés par un lot d'ingrédients. */
  private async loadFoodMap(
    ingredients: RecipeIngredient[],
  ): Promise<Map<string, FoodEntity>> {
    const ids = [
      ...new Set(
        ingredients.map((i) => i.foodId).filter((v): v is string => !!v),
      ),
    ];
    if (ids.length === 0) return new Map();
    const rows = await this.foods.find({ where: { id: In(ids) } });
    return new Map(rows.map((f) => [f.id, f]));
  }

  private typeResponse(t: MealTypeEntity) {
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      isDefault: t.isDefault,
      position: t.position,
    };
  }

  private async getOrThrow(id: string): Promise<RecipeEntity> {
    const item = await this.recipes.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Recette introuvable.');
    return item;
  }

  private async getMealTypeOrThrow(id: string): Promise<MealTypeEntity> {
    const type = await this.mealTypes.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Type de repas introuvable.');
    return type;
  }

  private async assertMealTypeExists(id?: string | null): Promise<void> {
    if (!id) return;
    const type = await this.mealTypes.findOne({ where: { id } });
    if (!type) throw new BadRequestException('Type de repas inconnu.');
  }

  private validateTitle(title?: string): string {
    const trimmed = (title ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le titre est obligatoire.');
    if (trimmed.length > TITLE_MAX) {
      throw new BadRequestException(
        `Le titre ne peut dépasser ${TITLE_MAX} caractères.`,
      );
    }
    return trimmed;
  }

  private validateMealTypeName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > MEAL_TYPE_NAME_MAX) {
      throw new BadRequestException(
        `Le nom ne peut dépasser ${MEAL_TYPE_NAME_MAX} caractères.`,
      );
    }
    return trimmed;
  }

  // --- Aliments ---

  private foodResponse(f: FoodEntity) {
    return {
      id: f.id,
      name: f.name,
      unit: f.unit,
      carbs: Number(f.carbs),
      protein: Number(f.protein),
      fat: Number(f.fat),
      kcal: Number(f.kcal),
      createdAt: f.createdAt,
    };
  }

  private foodFromInput(input: FoodInput, name: string, nameKey: string) {
    const carbs = this.normalizeMacro(input.carbs);
    const protein = this.normalizeMacro(input.protein);
    const fat = this.normalizeMacro(input.fat);
    return {
      name,
      nameKey,
      unit: this.normalizeUnit(input.unit),
      carbs,
      protein,
      fat,
      kcal: this.computeKcal(carbs, protein, fat),
    };
  }

  private async getFoodOrThrow(id: string): Promise<FoodEntity> {
    const food = await this.foods.findOne({ where: { id } });
    if (!food) throw new NotFoundException('Aliment introuvable.');
    return food;
  }

  private validateFoodName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > FOOD_NAME_MAX) {
      throw new BadRequestException(
        `Le nom ne peut dépasser ${FOOD_NAME_MAX} caractères.`,
      );
    }
    return trimmed;
  }

  private normalizeUnit(unit?: FoodUnit): FoodUnit {
    return unit && FOOD_UNITS.includes(unit) ? unit : 'g';
  }

  /** Macro pour 100 g/ml : nombre fini dans [0, MACRO_MAX], arrondi à 0,01. */
  private normalizeMacro(value?: number | null): number {
    if (value === null || value === undefined || (value as unknown) === '') {
      return 0;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return round2(Math.min(n, MACRO_MAX));
  }

  /** Calories d'Atwater : 4·glucides + 4·protéines + 9·lipides (pour 100 g/ml). */
  private computeKcal(carbs: number, protein: number, fat: number): number {
    return round1(4 * carbs + 4 * protein + 9 * fat);
  }

  private normalizeDifficulty(
    value?: RecipeDifficulty | null,
  ): RecipeDifficulty | null {
    if (value == null) return null;
    return DIFFICULTIES.includes(value) ? value : null;
  }

  /** Labels : trim, suppression des vides, dédoublonnage insensible casse (RG-08). */
  private normalizeLabels(labels?: string[]): string[] {
    if (!Array.isArray(labels)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of labels) {
      const label = String(raw ?? '')
        .trim()
        .slice(0, 40);
      if (!label) continue;
      const key = this.normalizeKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
    return out;
  }

  /** Ingrédients : ignore les lignes sans intitulé, (ré)assigne un id stable (RG-02). */
  private normalizeIngredients(input?: IngredientInput[]): RecipeIngredient[] {
    if (!Array.isArray(input)) return [];
    const out: RecipeIngredient[] = [];
    for (const i of input) {
      const label = String(i?.label ?? '')
        .trim()
        .slice(0, 200);
      if (!label) continue;
      out.push({
        id: i?.id || randomUUID(),
        foodId: i?.foodId ?? null,
        quantity: this.normalizeNumber(i?.quantity),
        unit: this.normalizeText(i?.unit, 24),
        label,
        note: this.normalizeText(i?.note, 200),
      });
    }
    return out;
  }

  /** Étapes : ignore les vides, (ré)assigne un id stable (RG-02). */
  private normalizeSteps(input?: StepInput[]): RecipeStep[] {
    if (!Array.isArray(input)) return [];
    const out: RecipeStep[] = [];
    for (const s of input) {
      const text = String(s?.text ?? '')
        .trim()
        .slice(0, 2000);
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
    if (value === null || value === undefined || (value as unknown) === '')
      return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 1000) / 1000;
  }

  private normalizeInt(value?: number | null): number | null {
    const n = this.normalizeNumber(value);
    return n === null ? null : Math.round(n);
  }

  private async maxRecipePosition(): Promise<number> {
    const row = await this.recipes
      .createQueryBuilder('r')
      .select('MAX(r.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async maxMealTypePosition(): Promise<number> {
    const row = await this.mealTypes
      .createQueryBuilder('t')
      .select('MAX(t.position)', 'max')
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
