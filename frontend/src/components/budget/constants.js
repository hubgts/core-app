// Métadonnées partagées du sous-module Budget.
// Réutilise les formateurs € du module Finances (helpers partagés).
export { formatEur, formatSignedEur, trendClass } from '../finances/constants';

// Borne une valeur dans [0, 100] (largeurs de barres en %).
export const clampPct = (v) => Math.min(Math.max(v ?? 0, 0), 100);

// Libellé d'une catégorie avec son icône (« 🏠 Logement »).
export const categoryLabel = (c) => `${c.icon ? `${c.icon} ` : ''}${c.name}`;

// Options <Combobox> depuis les catégories (option « vide » optionnelle).
export const categoryOptions = (categories, emptyLabel) => [
  ...(emptyLabel ? [{ value: '', label: emptyLabel }] : []),
  ...categories.map((c) => ({ value: c.id, label: categoryLabel(c) })),
];

export const BUDGET_COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#f87171',
  '#22d3ee',
  '#c084fc',
];

export const BUDGET_ICONS = [
  '🏠',
  '🍔',
  '🐷',
  '🎉',
  '🚗',
  '💡',
  '🎁',
  '📈',
  '🩺',
  '✈️',
];

// Plan proposé au démarrage (50/30/20) — l'utilisateur peut tout modifier.
export const DEFAULT_PLAN = [
  {
    name: 'Besoins',
    targetPct: 50,
    kind: 'depense',
    icon: '🏠',
    color: '#38bdf8',
  },
  {
    name: 'Plaisirs',
    targetPct: 30,
    kind: 'depense',
    icon: '🎉',
    color: '#a78bfa',
  },
  {
    name: 'Épargne',
    targetPct: 20,
    kind: 'epargne',
    icon: '🐷',
    color: '#34d399',
  },
];

// "Mars 2026" depuis un mois 'YYYY-MM'.
const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_FR[m - 1]} ${y}`;
}

// Mois précédent / suivant ('YYYY-MM').
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// État d'une catégorie vs sa cible → libellé + tendance (couleur).
export function statusMeta(state) {
  switch (state) {
    case 'within':
      return { label: 'Dans la cible', tone: 'up' };
    case 'over':
      return { label: 'Dépassement', tone: 'down' };
    case 'reached':
      return { label: 'Objectif atteint', tone: 'up' };
    case 'insufficient':
      return { label: 'Sous l’objectif', tone: 'down' };
    default:
      return null;
  }
}
