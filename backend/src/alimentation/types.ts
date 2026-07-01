// DTO d'entrée et constantes du module Alimentation (recettes).

export type RecipeDifficulty = 'facile' | 'moyen' | 'difficile';

export type FoodUnit = 'g' | 'ml';

/** DTO d'entrée d'un aliment (macros pour 100 g/ml ; kcal dérivé côté service). */
export interface FoodInput {
  name?: string;
  unit?: FoodUnit;
  carbs?: number | null;
  protein?: number | null;
  fat?: number | null;
}

/** Une ligne d'ingrédient. */
export interface IngredientInput {
  id?: string;
  foodId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  label?: string;
  note?: string | null;
}

/** Une étape de la recette. */
export interface StepInput {
  id?: string;
  text?: string;
}

export interface RecipeInput {
  title?: string;
  description?: string | null;
  mealTypeId?: string | null;
  labels?: string[];
  ingredients?: IngredientInput[];
  steps?: StepInput[];
  servings?: number | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  restTimeMin?: number | null;
  difficulty?: RecipeDifficulty | null;
  color?: string;
}

export interface MealTypeInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}

/**
 * Référentiel de types de repas amorcé au premier démarrage (RG-05). Ces
 * entrées restent ensuite éditables et supprimables comme les autres.
 */
export const DEFAULT_MEAL_TYPES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: 'Entrée', icon: '🥗', color: '#10B981' },
  { name: 'Plat', icon: '🍽️', color: '#F59E0B' },
  { name: 'Dessert', icon: '🍰', color: '#EC4899' },
  { name: 'Petit-déjeuner', icon: '🥐', color: '#F97316' },
  { name: 'Apéritif', icon: '🥂', color: '#8B5CF6' },
  { name: 'Boisson', icon: '🥤', color: '#38BDF8' },
  { name: 'Base', icon: '🫙', color: '#64748B' },
  { name: 'Autre', icon: '📋', color: '#5A6B7E' },
];
