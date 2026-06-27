// DTO d'entrée et constantes du module Course (listes de courses).

/** Une ligne d'item dans une liste de courses (entrée API). */
export interface ShoppingItemInput {
  id?: string;
  /** Référence d'un article existant. Prioritaire sur `articleName`. */
  articleId?: string | null;
  /** Nom d'article : si fourni sans `articleId`, l'article est résolu/créé à la volée (RG-17). */
  articleName?: string;
  quantity?: number | null;
  /** Mesure ; si omise à la création, héritée de l'article. */
  unit?: string | null;
  note?: string | null;
  checked?: boolean;
  sourceRecipeId?: string | null;
}

export interface ShoppingListInput {
  title?: string;
  /** Date au format `YYYY-MM-DD` ; `null` pour retirer la date. */
  date?: string | null;
}

export interface ShoppingTemplateInput {
  title?: string;
  items?: ShoppingItemInput[];
}

export interface ArticleInput {
  name?: string;
  unit?: string | null;
  aisleId?: string | null;
}

export interface AisleInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}

/** Import d'une recette du module Alimentation vers une liste. */
export interface ImportRecipeInput {
  recipeId?: string;
  /** Nombre de portions cible (mise à l'échelle, RG-12). */
  servings?: number | null;
  /** Titre de la nouvelle liste (création depuis recette uniquement). */
  title?: string;
}

/**
 * Référentiel de rayons amorcé au premier démarrage. L'ordre = parcours en
 * magasin (RG-08). Ces entrées restent éditables / supprimables (RG-05).
 */
export const DEFAULT_AISLES: { name: string; icon: string; color: string }[] = [
  { name: 'Fruits & légumes', icon: '🥦', color: '#22C55E' },
  { name: 'Frais', icon: '🧀', color: '#38BDF8' },
  { name: 'Boulangerie', icon: '🥖', color: '#D97706' },
  { name: 'Épicerie salée', icon: '🥫', color: '#F59E0B' },
  { name: 'Épicerie sucrée', icon: '🍫', color: '#EC4899' },
  { name: 'Surgelés', icon: '🧊', color: '#60A5FA' },
  { name: 'Boissons', icon: '🥤', color: '#8B5CF6' },
  { name: 'Hygiène', icon: '🧼', color: '#14B8A6' },
  { name: 'Maison', icon: '🧽', color: '#64748B' },
  { name: 'Animaux', icon: '🐾', color: '#A16207' },
  { name: 'Autre', icon: '📦', color: '#5A6B7E' },
];

/**
 * Quelques articles courants amorcés au premier démarrage, rattachés à un rayon
 * par défaut (par nom de rayon). Pur amorçage : éditables / supprimables.
 */
export const DEFAULT_ARTICLES: {
  name: string;
  unit: string;
  aisle: string;
}[] = [
  { name: 'Pommes de terre', unit: 'kg', aisle: 'Fruits & légumes' },
  { name: 'Tomates', unit: 'unité', aisle: 'Fruits & légumes' },
  { name: 'Oignons', unit: 'unité', aisle: 'Fruits & légumes' },
  { name: 'Bananes', unit: 'unité', aisle: 'Fruits & légumes' },
  { name: 'Lait demi-écrémé', unit: 'L', aisle: 'Frais' },
  { name: 'Beurre doux', unit: 'paquet', aisle: 'Frais' },
  { name: 'Œufs', unit: 'unité', aisle: 'Frais' },
  { name: 'Yaourt nature', unit: 'pot', aisle: 'Frais' },
  { name: 'Baguette', unit: 'unité', aisle: 'Boulangerie' },
  { name: 'Pâtes', unit: 'paquet', aisle: 'Épicerie salée' },
  { name: 'Riz', unit: 'kg', aisle: 'Épicerie salée' },
  { name: 'Huile d’olive', unit: 'L', aisle: 'Épicerie salée' },
  { name: 'Sel', unit: 'paquet', aisle: 'Épicerie salée' },
  { name: 'Farine', unit: 'kg', aisle: 'Épicerie sucrée' },
  { name: 'Sucre', unit: 'kg', aisle: 'Épicerie sucrée' },
  { name: 'Café', unit: 'paquet', aisle: 'Épicerie sucrée' },
  { name: 'Eau', unit: 'L', aisle: 'Boissons' },
  { name: 'Papier toilette', unit: 'paquet', aisle: 'Hygiène' },
  { name: 'Liquide vaisselle', unit: 'unité', aisle: 'Maison' },
];

/** Unités (mesures) proposées par défaut dans les sélecteurs. */
export const COMMON_UNITS = [
  'unité',
  'g',
  'kg',
  'L',
  'mL',
  'paquet',
  'boîte',
  'botte',
  'pot',
  'sachet',
];
