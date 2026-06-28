// Types & règles métier du module Paris Sportifs.

/** Un pari est soit simple (1 sélection) soit combiné (≥ 2 sélections). */
export type BetType = 'simple' | 'combine';
export const BET_TYPES: BetType[] = ['simple', 'combine'];

/**
 * Statut d'un ticket. Pilote de façon déterministe le retour, le bénéfice et
 * l'impact sur le capital (voir `betProfit`).
 * - pending   : en cours (mise immobilisée, bénéfice latent 0)
 * - won       : gagné  → retour = mise × cote
 * - lost      : perdu  → retour = 0
 * - void      : remboursé (issue nulle) → mise rendue, bénéfice 0
 * - cancelled : annulé (exclu de toutes les stats, comme s'il n'existait pas)
 * - cashout   : clôture anticipée → retour = cashoutAmount
 */
export type BetStatus =
  'pending' | 'won' | 'lost' | 'void' | 'cancelled' | 'cashout';
export const BET_STATUSES: BetStatus[] = [
  'pending',
  'won',
  'lost',
  'void',
  'cancelled',
  'cashout',
];

/** Statut d'une sélection (leg). Pilote le statut d'un combiné (RG-08/09). */
export type SelectionStatus = 'pending' | 'won' | 'lost' | 'void';
export const SELECTION_STATUSES: SelectionStatus[] = [
  'pending',
  'won',
  'lost',
  'void',
];

// --- DTO d'entrée ---

export interface BankrollInput {
  name?: string;
  startingCapital?: number;
  bookmaker?: string | null;
  color?: string;
  icon?: string;
}

export interface SelectionInput {
  sport?: string;
  event?: string | null;
  market?: string | null;
  pick?: string | null;
  odds?: number;
  status?: SelectionStatus;
}

export interface BetInput {
  type?: BetType;
  stake?: number;
  odds?: number; // ignoré pour un combiné (dérivé du produit des sélections)
  status?: BetStatus;
  commission?: number;
  cashoutAmount?: number | null;
  closingOdds?: number | null;
  placedAt?: string;
  settledAt?: string | null;
  note?: string | null;
  selections?: SelectionInput[];
}

export interface SettleBetInput {
  status?: BetStatus;
  cashoutAmount?: number | null;
  commission?: number;
  settledAt?: string | null;
}

// --- Règles métier dérivées ---

/** Un statut « réglé » = avec issue connue (exclut pending & cancelled). */
export function isSettled(status: BetStatus): boolean {
  return (
    status === 'won' ||
    status === 'lost' ||
    status === 'void' ||
    status === 'cashout'
  );
}

/** Le pari a-t-il « engagé » la mise (compte dans le turnover / mises jouées) ? */
export function hasAction(status: BetStatus): boolean {
  return status === 'won' || status === 'lost' || status === 'cashout';
}

/** Retour (payout) du ticket selon son statut. */
export function betPayout(bet: {
  status: BetStatus;
  stake: number;
  odds: number;
  cashoutAmount: number | null;
}): number {
  switch (bet.status) {
    case 'won':
      return bet.stake * bet.odds;
    case 'void':
      return bet.stake; // mise rendue
    case 'cashout':
      return bet.cashoutAmount ?? 0;
    case 'lost':
    default:
      return 0;
  }
}

/** Bénéfice net du ticket (retour − mise − commission). 0 si non réglé. */
export function betProfit(bet: {
  status: BetStatus;
  stake: number;
  odds: number;
  commission: number;
  cashoutAmount: number | null;
}): number {
  if (!isSettled(bet.status)) return 0;
  if (bet.status === 'void') return 0; // mise rendue, ni gain ni perte
  if (bet.status === 'lost') return -bet.stake;
  return betPayout(bet) - bet.stake - (bet.commission ?? 0);
}

/**
 * Cote d'un combiné = produit des cotes des sélections, les sélections
 * remboursées (void) étant ramenées à 1,00 (RG-09).
 */
export function combineOdds(
  selections: { odds: number; status: SelectionStatus }[],
): number {
  return selections.reduce(
    (acc, s) => acc * (s.status === 'void' ? 1 : s.odds),
    1,
  );
}

/**
 * Statut d'un combiné dérivé de ses sélections (RG-08) :
 * - perdu dès qu'une sélection est perdue ;
 * - remboursé si toutes les sélections sont remboursées ;
 * - gagné quand toutes sont gagnées/remboursées ;
 * - en cours sinon.
 */
export function deriveBetStatus(
  selections: { status: SelectionStatus }[],
): BetStatus {
  if (selections.length === 0) return 'pending';
  if (selections.some((s) => s.status === 'lost')) return 'lost';
  if (selections.every((s) => s.status === 'void')) return 'void';
  if (selections.every((s) => s.status === 'won' || s.status === 'void')) {
    return 'won';
  }
  return 'pending';
}
