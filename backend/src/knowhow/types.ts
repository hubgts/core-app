// DTO d'entrée et constantes du module Savoir-faire.

/** Une ligne de composant (ingrédient, produit, matériel). */
export interface ComponentInput {
  id?: string;
  quantity?: number | null;
  unit?: string | null;
  label?: string;
  note?: string | null;
}

/** Une étape de la marche à suivre. */
export interface StepInput {
  id?: string;
  text?: string;
}

export interface KnowHowInput {
  title?: string;
  goal?: string | null;
  categoryId?: string | null;
  labels?: string[];
  components?: ComponentInput[];
  steps?: StepInput[];
  yieldText?: string | null;
  yieldBase?: number | null;
  totalTimeMin?: number | null;
  color?: string;
}

export interface CategoryInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}

/**
 * Référentiel par défaut amorcé au premier démarrage (RG-05). Ces catégories
 * restent ensuite éditables et supprimables comme les autres.
 */
export const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: 'Cuisine', icon: '🍳', color: '#F59E0B' },
  { name: 'Maison', icon: '🧼', color: '#38BDF8' },
  { name: 'Soin', icon: '🧴', color: '#8B5CF6' },
  { name: 'Bricolage', icon: '🔧', color: '#10B981' },
  { name: 'Autre', icon: '📋', color: '#5A6B7E' },
];
