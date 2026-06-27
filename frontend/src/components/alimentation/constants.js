// Métadonnées et helpers partagés du module Alimentation.

// Palette de couleurs de carte façon Google Keep (la 1re = neutre/défaut).
export const CARD_COLORS = [
  '', // neutre
  '#FEF3C7', // ambre clair
  '#DBEAFE', // bleu clair
  '#E0E7FF', // indigo clair
  '#EDE9FE', // violet clair
  '#FCE7F3', // rose clair
  '#DCFCE7', // vert clair
  '#FEE2E2', // rouge clair
  '#FEF9C3', // jaune clair
  '#F1F5F9', // gris clair
];

// Émojis proposés pour personnaliser un type de repas.
export const MEAL_TYPE_ICONS = [
  '🥗', '🍽️', '🍰', '🥐', '🥂', '🥤', '🫙', '📋', '🍲', '🍜',
  '🥘', '🍝', '🍕', '🥪', '🌮', '🍳', '🧁', '🍫', '🥧', '🍷',
];

// Niveaux de difficulté (valeur backend → libellé).
export const DIFFICULTIES = [
  { value: 'facile', label: 'Facile' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'difficile', label: 'Difficile' },
];
export const difficultyLabel = (v) =>
  DIFFICULTIES.find((d) => d.value === v)?.label ?? '';

// Repère visuel pour les recettes sans type de repas.
export const NO_MEAL_TYPE = { id: null, name: 'Sans type', icon: '🗂️', color: '#93A3B5' };

/** Indexe les types de repas par id pour un accès O(1) ; null → NO_MEAL_TYPE. */
export function indexMealTypes(types = []) {
  const map = new Map();
  for (const t of types) map.set(t.id, t);
  return (id) => map.get(id) ?? NO_MEAL_TYPE;
}

/**
 * Met à l'échelle une quantité (RG-10). Les quantités nulles restent nulles
 * (ingrédient non chiffré, affiché inchangé). Arrondi ≤ 2 décimales, décimales
 * inutiles supprimées.
 */
export function scaleQuantity(quantity, factor) {
  if (quantity == null) return null;
  const scaled = quantity * factor;
  return Math.round(scaled * 100) / 100;
}

// "1,5" / "30" / "0,25" (format FR, décimales inutiles retirées).
export function formatQuantity(n) {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

// "1 h 30" / "45 min" à partir d'un nombre de minutes.
export function formatDuration(min) {
  if (min == null || Number.isNaN(min)) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

// "4 parts" / "1 part" à partir d'un nombre de portions.
export function formatServings(n) {
  if (n == null || Number.isNaN(n)) return '';
  return `${formatQuantity(n)} part${n > 1 ? 's' : ''}`;
}

/** Une ligne d'ingrédient utilisée comme titre de section (« — Pour la garniture — »). */
export function isSection(ingredient) {
  const l = (ingredient?.label ?? '').trim();
  return ingredient?.quantity == null && !ingredient?.unit && /^[—-].*[—-]$/.test(l);
}
