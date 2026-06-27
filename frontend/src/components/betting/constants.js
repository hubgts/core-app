// Métadonnées partagées du module Paris Sportifs.

export const BET_TYPE_META = {
  simple: { label: 'Simple', icon: '🎯' },
  combine: { label: 'Combiné', icon: '🧩' },
};

// Statuts de pari : libellé, icône, couleur de tendance.
export const STATUS_META = {
  pending: { label: 'En cours', icon: '⏳', tone: 'flat' },
  won: { label: 'Gagné', icon: '✅', tone: 'up' },
  lost: { label: 'Perdu', icon: '❌', tone: 'down' },
  void: { label: 'Remboursé', icon: '↩️', tone: 'flat' },
  cancelled: { label: 'Annulé', icon: '⛔', tone: 'flat' },
  cashout: { label: 'Cash out', icon: '💸', tone: 'flat' },
};

// Statuts proposés au règlement express d'un ticket.
export const SETTLE_STATUSES = ['won', 'lost', 'void', 'cashout', 'cancelled'];

// Statuts d'une sélection de combiné.
export const SELECTION_STATUS_META = {
  pending: { label: 'En cours', icon: '⏳' },
  won: { label: 'Gagnée', icon: '✅' },
  lost: { label: 'Perdue', icon: '❌' },
  void: { label: 'Remboursée', icon: '↩️' },
};

// Icône d'un sport connu (repli générique sinon).
export function sportIcon(sport) {
  const key = (sport || '').toLowerCase();
  if (key.includes('mma') || key.includes('ufc')) return '🥊';
  if (key.includes('foot')) return '⚽';
  if (key.includes('tennis')) return '🎾';
  if (key.includes('basket')) return '🏀';
  return '🏅';
}

export const BANKROLL_ICONS = ['🎰', '🥊', '⚽', '🎯', '🍀', '🔥', '💰', '📈', '🏆', '🎲'];
export const BANKROLL_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#a78bfa'];

// "57,00 €"
export function formatEur(n, { decimals = 2 } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// "+55,89 €" / "−5,00 €"
export function formatSignedEur(n, opts) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${formatEur(Math.abs(n), opts)}`;
}

// "98,05 %"
export function formatPct(n, { signed = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = signed ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  return `${sign}${Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
}

// "8,000" (cotes à 3 décimales)
export function formatOdds(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

// Parse une cote "2,97" / "2.97" → 2.97. Lève si invalide ou < 1.
export function parseOdds(str) {
  const n = Number(String(str).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 1) throw new Error('Cote invalide (≥ 1 attendu).');
  return n;
}

export function trendClass(n) {
  if (n == null || n === 0) return 'flat';
  return n > 0 ? 'up' : 'down';
}
