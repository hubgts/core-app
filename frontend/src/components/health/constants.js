// Métadonnées partagées du module Santé.

// Accent du module (aligné sur un futur token --m-health).
export const HEALTH_COLOR = '#f472b6'; // rose, distinct des autres modules
export const TREND_COLOR = '#f472b6';
export const RAW_COLOR = '#9fb0c4'; // points bruts, discrets
export const GOAL_COLOR = '#fbbf24'; // ligne d'objectif (ambre)

// Métrique « poids » + mensurations connues, orientées musculation.
// `unit` et `icon` pour l'UI. Ordre = haut → bas du corps.
export const METRIC_META = {
  weight: { label: 'Poids', short: 'Poids', unit: 'kg', icon: '⚖️', decimals: 1 },
  neck: { label: 'Cou', short: 'Cou', unit: 'cm', icon: '🧣', decimals: 1 },
  shoulders: { label: 'Épaules', short: 'Épaules', unit: 'cm', icon: '🤸', decimals: 1 },
  chest: { label: 'Torse (poitrine)', short: 'Torse', unit: 'cm', icon: '🎽', decimals: 1 },
  arm: { label: 'Biceps', short: 'Biceps', unit: 'cm', icon: '💪', decimals: 1 },
  forearm: { label: 'Avant-bras', short: 'Avant-bras', unit: 'cm', icon: '✊', decimals: 1 },
  hips: { label: 'Hanches', short: 'Hanches', unit: 'cm', icon: '🍑', decimals: 1 },
  thigh: { label: 'Cuisse', short: 'Cuisse', unit: 'cm', icon: '🦵', decimals: 1 },
  calf: { label: 'Mollet', short: 'Mollet', unit: 'cm', icon: '🦶', decimals: 1 },
};

// Toutes les mensurations configurables (hors poids), dans l'ordre canonique.
export const ALL_MEASUREMENTS = [
  'neck',
  'shoulders',
  'chest',
  'arm',
  'forearm',
  'hips',
  'thigh',
  'calf',
];

export const PERIODS = [
  { id: 'month', label: 'Mois', days: 31 },
  { id: '3months', label: '3 mois', days: 92 },
  { id: 'year', label: 'Année', days: 366 },
  { id: 'all', label: 'Tout', days: Infinity },
];

export function metricMeta(key) {
  return METRIC_META[key] ?? { label: key, short: key, unit: '', icon: '•', decimals: 1 };
}

// "78,4 kg" — formatage français d'une valeur d'une métrique donnée.
export function formatMetric(value, key) {
  if (value == null || Number.isNaN(value)) return '—';
  const meta = metricMeta(key);
  const n = value.toLocaleString('fr-FR', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${n} ${meta.unit}`.trim();
}

// "+0,6 kg" / "−1,9 kg" (signe explicite + flèche pour l'accessibilité).
export function formatSignedMetric(value, key) {
  if (value == null || Number.isNaN(value)) return '—';
  const meta = metricMeta(key);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  const n = Math.abs(value).toLocaleString('fr-FR', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${arrow} ${sign}${n} ${meta.unit}`.trim();
}

/**
 * Classe de tendance colorée selon le SENS de l'objectif (RG / §7).
 * - objectif de perte : Δ négatif = bien (vert).
 * - objectif de prise : Δ positif = bien.
 * - sans objectif : neutre.
 */
export function deltaClass(delta, direction) {
  if (delta == null || delta === 0) return 'flat';
  if (!direction) return 'flat';
  const good = direction === 'loss' ? delta < 0 : delta > 0;
  return good ? 'up' : 'down';
}
