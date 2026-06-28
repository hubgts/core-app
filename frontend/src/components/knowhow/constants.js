// Métadonnées et helpers partagés du module Savoir-faire.

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

// Émojis proposés pour personnaliser une catégorie.
export const CATEGORY_ICONS = [
  '🍳',
  '🧼',
  '🧴',
  '🔧',
  '📋',
  '🥗',
  '🍰',
  '🧹',
  '🌿',
  '🧽',
  '🪛',
  '🏠',
  '💡',
  '🎨',
  '🧶',
  '🪴',
  '🐾',
  '💊',
  '🚗',
  '🎁',
];

// Repère visuel pour les savoir-faire sans catégorie.
export const NO_CATEGORY = {
  id: null,
  name: 'Sans catégorie',
  icon: '🗂️',
  color: '#93A3B5',
};

/** Indexe les catégories par id pour un accès O(1) ; null → NO_CATEGORY. */
export function indexCategories(categories = []) {
  const map = new Map();
  for (const c of categories) map.set(c.id, c);
  return (id) => map.get(id) ?? NO_CATEGORY;
}

/**
 * Met à l'échelle une quantité (RG-10). Les quantités nulles restent nulles
 * (composant non chiffré, affiché inchangé). Arrondi ≤ 2 décimales, décimales
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

/** Une ligne de composant utilisée comme titre de section (« — Pour la pâte — »). */
export function isSection(component) {
  const l = (component?.label ?? '').trim();
  return (
    component?.quantity == null && !component?.unit && /^[—-].*[—-]$/.test(l)
  );
}
