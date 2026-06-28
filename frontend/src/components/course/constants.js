// Métadonnées et helpers partagés du module Course.

// Mesures (unités) proposées dans les sélecteurs. Saisie libre toujours permise.
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

// Émojis proposés pour personnaliser un rayon.
export const AISLE_ICONS = [
  '🥦',
  '🧀',
  '🥖',
  '🥫',
  '🍫',
  '🧊',
  '🥤',
  '🧼',
  '🧽',
  '🐾',
  '📦',
  '🍎',
  '🥩',
  '🐟',
  '🧴',
  '🍼',
  '🧹',
  '🌿',
  '🍷',
  '🛒',
];

// Rayon de repli pour les articles sans rayon.
export const NO_AISLE = { id: null, name: 'Autre', icon: '📦' };

// "1,5" / "30" / "0,25" (format FR, décimales inutiles retirées).
export function formatQuantity(n) {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** "2 L pommes" → libellé quantité + mesure (les deux optionnels). */
export function formatMeasure(quantity, unit) {
  const q = formatQuantity(quantity);
  return [q, unit].filter(Boolean).join(' ');
}

/** Regroupe des items par rayon, sections ordonnées par parcours (RG-08). */
export function groupByAisle(items = []) {
  const groups = new Map();
  for (const it of items) {
    const key = it.aisleId ?? '__none__';
    if (!groups.has(key)) {
      groups.set(key, {
        aisleId: it.aisleId ?? null,
        name: it.aisleName ?? 'Autre',
        icon: it.aisleIcon ?? '📦',
        order: it.aisleOrder ?? 999,
        items: [],
      });
    }
    groups.get(key).items.push(it);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}
