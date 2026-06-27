// Moteur de statistiques d'une bankroll : performance, risque, distribution.
// Toutes les grandeurs sont dérivées des paris (non annulés).

import { BankrollEntity } from './entities/bankroll.entity';
import { BetEntity } from './entities/bet.entity';
import { betProfit, hasAction, isSettled } from './types';
import { dateOf, daysBetween, todayStr } from './date.util';
import { round2, round3 } from '../common/round.util';

export interface BankrollStats {
  // Comptes
  betCount: number;
  wonCount: number;
  lostCount: number;
  voidCount: number;
  pendingCount: number;
  cashoutCount: number;
  // Performance
  profit: number;
  roi: number | null;
  startingCapital: number;
  currentCapital: number;
  progression: number | null; // ROC
  twr: number | null;
  tri: number | null;
  successRate: number | null;
  // Activité
  turnover: number; // mises jouées
  pendingStake: number; // mises en cours
  // Risque
  maxDrawdown: number;
  maxWinStreak: number;
  maxLossStreak: number;
  // Distribution
  avgStake: number | null;
  maxStake: number | null;
  avgOdds: number | null;
  bestWonOdds: number | null;
  biggestWin: number | null;
  biggestLoss: number | null;
  commissions: number;
  clv: number | null;
  // Courbe de capital [{ date, capital }]
  curve: { date: string; capital: number }[];
}

/** Calcule toutes les statistiques d'une bankroll. */
export function computeStats(
  bankroll: BankrollEntity,
  allBets: BetEntity[],
): BankrollStats {
  // Les paris annulés sont exclus de toutes les stats (RG-15).
  const bets = allBets.filter((b) => b.status !== 'cancelled');
  const settled = bets.filter((b) => isSettled(b.status));
  const action = bets.filter((b) => hasAction(b.status)); // won/lost/cashout
  const won = bets.filter((b) => b.status === 'won');
  const lost = bets.filter((b) => b.status === 'lost');

  const profitOf = (b: BetEntity) => betProfit(b);

  const profit = round2(settled.reduce((s, b) => s + profitOf(b), 0));
  const turnover = round2(action.reduce((s, b) => s + b.stake, 0));
  const pendingStake = round2(
    bets.filter((b) => b.status === 'pending').reduce((s, b) => s + b.stake, 0),
  );
  const startingCapital = round2(bankroll.startingCapital);
  const currentCapital = round2(startingCapital + profit);

  const decided = won.length + lost.length; // hors void / pending
  const successRate = decided > 0 ? round2((won.length / decided) * 100) : null;
  const roi = turnover > 0 ? round2((profit / turnover) * 100) : null;
  const progression =
    startingCapital > 0 ? round2((profit / startingCapital) * 100) : null;
  // Sans mouvement de caisse, le TWR équivaut à la progression du capital.
  const twr =
    startingCapital > 0
      ? round2((currentCapital / startingCapital - 1) * 100)
      : null;

  const avgStake = action.length > 0 ? round2(turnover / action.length) : null;
  const maxStake = bets.length > 0 ? round2(Math.max(...bets.map((b) => b.stake))) : null;
  const avgOdds =
    settled.length > 0
      ? round3(settled.reduce((s, b) => s + b.odds, 0) / settled.length)
      : null;
  const bestWonOdds = won.length > 0 ? round3(Math.max(...won.map((b) => b.odds))) : null;
  const profits = settled.map(profitOf);
  const biggestWin = profits.length > 0 ? round2(Math.max(...profits)) : null;
  const biggestLoss = profits.length > 0 ? round2(Math.min(...profits)) : null;
  const commissions = round2(settled.reduce((s, b) => s + (b.commission ?? 0), 0));

  // CLV : moyenne de (cote prise / cote clôture − 1) là où la clôture est connue.
  const withClosing = settled.filter((b) => b.closingOdds && b.closingOdds > 0);
  const clv =
    withClosing.length > 0
      ? round2(
          (withClosing.reduce((s, b) => s + (b.odds / (b.closingOdds as number) - 1), 0) /
            withClosing.length) *
            100,
        )
      : null;

  // Séries (chronologique, sur won/lost uniquement).
  const { maxWinStreak, maxLossStreak } = computeStreaks(settled);

  // Courbe de capital + drawdown.
  const curve = computeCurve(startingCapital, settled);
  const maxDrawdown = round2(computeDrawdown(curve.map((p) => p.capital)));

  const tri = computeTri(bankroll, settled, currentCapital);

  return {
    betCount: bets.length,
    wonCount: won.length,
    lostCount: lost.length,
    voidCount: bets.filter((b) => b.status === 'void').length,
    pendingCount: bets.filter((b) => b.status === 'pending').length,
    cashoutCount: bets.filter((b) => b.status === 'cashout').length,
    profit,
    roi,
    startingCapital,
    currentCapital,
    progression,
    twr,
    tri,
    successRate,
    turnover,
    pendingStake,
    maxDrawdown,
    maxWinStreak,
    maxLossStreak,
    avgStake,
    maxStake,
    avgOdds,
    bestWonOdds,
    biggestWin,
    biggestLoss,
    commissions,
    clv,
    curve,
  };
}

/** Date de règlement d'un pari (repli sur placedAt puis createdAt). */
function settleDate(b: BetEntity): string {
  return b.settledAt || b.placedAt || dateOf(b.createdAt);
}

function computeStreaks(settled: BetEntity[]): {
  maxWinStreak: number;
  maxLossStreak: number;
} {
  const seq = settled
    .filter((b) => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => settleDate(a).localeCompare(settleDate(b)));
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const b of seq) {
    if (b.status === 'won') {
      curWin += 1;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else {
      curLoss += 1;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }
  // La série de défaites est exprimée en négatif (convention d'affichage).
  return { maxWinStreak: maxWin, maxLossStreak: maxLoss === 0 ? 0 : -maxLoss };
}

/**
 * Courbe de capital : on part du capital de départ puis on cumule, par ordre
 * chronologique, les bénéfices des paris réglés. Les paris d'une même date sont
 * agrégés en un seul point.
 */
function computeCurve(
  startingCapital: number,
  settled: BetEntity[],
): { date: string; capital: number }[] {
  const deltas = settled
    .map((b) => ({ date: settleDate(b), delta: betProfit(b) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const curve: { date: string; capital: number }[] = [];
  let capital = startingCapital;
  const firstDate = deltas.length ? deltas[0].date : todayStr();
  curve.push({ date: firstDate, capital: round2(capital) });
  let i = 0;
  while (i < deltas.length) {
    const d = deltas[i].date;
    let sum = 0;
    while (i < deltas.length && deltas[i].date === d) {
      sum += deltas[i].delta;
      i += 1;
    }
    capital += sum;
    if (curve.length && curve[curve.length - 1].date === d) {
      curve[curve.length - 1].capital = round2(capital);
    } else {
      curve.push({ date: d, capital: round2(capital) });
    }
  }
  return curve;
}

/** Drawdown maximal (€) : plus forte baisse pic-à-creux de la courbe. */
function computeDrawdown(values: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * TRI (taux de rentabilité interne, annualisé) : capital de départ en sortie au
 * lancement, capital actuel comme valeur terminale. Résolu par bisection.
 */
function computeTri(
  bankroll: BankrollEntity,
  settled: BetEntity[],
  currentCapital: number,
): number | null {
  if (bankroll.startingCapital <= 0 || currentCapital <= 0) return null;
  const startDate = bankrollStartDate(bankroll, settled);
  const valuationDate = todayStr();
  const t = daysBetween(startDate, valuationDate) / 365;
  if (t <= 0) return null;

  const flows = [
    { t: 0, amount: -bankroll.startingCapital },
    { t, amount: currentCapital },
  ];
  const npv = (rate: number): number =>
    flows.reduce((s, f) => s + f.amount / Math.pow(1 + rate, f.t), 0);

  let lo = -0.9999;
  let hi = 1e7;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || (hi - lo) / 2 < 1e-9) return round2(mid * 100);
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return round2(((lo + hi) / 2) * 100);
}

function bankrollStartDate(bankroll: BankrollEntity, settled: BetEntity[]): string {
  const dates = [dateOf(bankroll.createdAt)];
  for (const b of settled) dates.push(b.placedAt || settleDate(b));
  return dates.sort((a, b) => a.localeCompare(b))[0];
}
