// Métadonnées partagées du module Finances.
import { frenchMonthYear } from '../../utils/date';

export const TYPE_META = {
  especes: { icon: '💵', label: 'Espèces', color: '#34d399' },
  compte_courant: { icon: '💳', label: 'Compte courant', color: '#38bdf8' },
  epargne: { icon: '🐷', label: 'Épargne', color: '#a78bfa' },
  investissement: { icon: '📈', label: 'Investissement', color: '#fbbf24' },
  dette: { icon: '🏦', label: 'Dette / Crédit', color: '#f87171' },
};

// Ordre d'affichage des types (actifs d'abord, dette en dernier).
export const TYPE_ORDER = [
  'especes',
  'compte_courant',
  'epargne',
  'investissement',
  'dette',
];

export const ICONS = ['💵', '💳', '🐷', '📈', '🏠', '🏦', '🚗', '🎯', '🛟', '💎'];

export function natureOf(type) {
  return type === 'dette' ? 'passif' : 'actif';
}

// "12 350 €" (sans décimales par défaut)
export function formatEur(n, { decimals = 0 } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// "+2 150 €" / "−400 €" (signe explicite)
export function formatSignedEur(n, opts) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${formatEur(Math.abs(n), opts)}`;
}

// "+1,5 %" / "−3,2 %"
export function formatSignedPct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

// Classe de tendance pour la couleur (hausse / baisse / neutre).
export function trendClass(n) {
  if (n == null || n === 0) return 'flat';
  return n > 0 ? 'up' : 'down';
}

// "il y a 3 j" / "aujourd'hui" / "il y a 2 mois" — depuis un nombre de jours.
export function formatDaysAgo(days) {
  if (days == null) return null;
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 31) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  return `il y a ${months} mois`;
}

/**
 * Phrase de rythme d'un objectif (carte/drawer/objectif net). `o` = objet `objective`
 * ou `netObjective` du backend. Renvoie `{ text, tone }` ou `null` (atteint / sans
 * estimation, géré ailleurs). `tone` ∈ up | down | flat.
 */
export function objectivePace(o) {
  if (!o || o.reached) return null;
  if (o.paceStatus === 'on_track' && o.eta) {
    return { text: `à ce rythme : ${frenchMonthYear(o.eta)}`, tone: 'up' };
  }
  if (o.paceStatus === 'behind') {
    const eta = o.eta ? ` (proj. ${frenchMonthYear(o.eta)})` : '';
    const req =
      o.requiredMonthly != null ? ` · +${formatEur(o.requiredMonthly)}/mois` : '';
    return { text: `en retard${eta}${req}`, tone: 'down' };
  }
  return null;
}
