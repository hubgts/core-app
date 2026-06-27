/**
 * Lissage et projection d'une série datée { date, value }.
 *
 * - Tendance = EMA (span 7) recalculée à chaque appel (RG-04).
 * - Δ sur fenêtre = différence de tendance interpolée entre deux dates (RG-05).
 * - Rythme / ETA = régression linéaire de la tendance (réutilise la logique
 *   décrite dans objectifs_epargne : pente + fallback < 3 points).
 */

import { addDays, daysBetween } from './date.util';
import { round1 } from '../common/round.util';

export interface DatedValue {
  date: string;
  value: number;
}
export interface TrendPoint extends DatedValue {
  trend: number;
}

/** EMA span 7 sur les points triés par date croissante. */
export function computeTrend(pointsAsc: DatedValue[]): TrendPoint[] {
  const alpha = 2 / (7 + 1);
  let ema: number | null = null;
  return pointsAsc.map((p) => {
    ema = ema == null ? p.value : alpha * p.value + (1 - alpha) * ema;
    return { date: p.date, value: round1(p.value), trend: round1(ema) };
  });
}

/**
 * Valeur de tendance interpolée à une date arbitraire. Renvoie null si la série
 * est vide. Hors bornes → valeur de l'extrémité la plus proche.
 */
export function trendAt(trend: TrendPoint[], date: string): number | null {
  if (trend.length === 0) return null;
  if (date <= trend[0].date) return trend[0].trend;
  if (date >= trend[trend.length - 1].date) return trend[trend.length - 1].trend;
  for (let i = 1; i < trend.length; i += 1) {
    const a = trend[i - 1];
    const b = trend[i];
    if (date <= b.date) {
      const span = daysBetween(a.date, b.date) || 1;
      const t = daysBetween(a.date, date) / span;
      return round1(a.trend + (b.trend - a.trend) * t);
    }
  }
  return trend[trend.length - 1].trend;
}

/**
 * Pente de la tendance en unité/jour depuis `from` (régression des moindres
 * carrés sur les points de tendance). Fallback (last − first)/jours si < 3
 * points. Renvoie null si données insuffisantes.
 */
export function slopePerDay(trend: TrendPoint[], from: string): number | null {
  const pts = trend.filter((p) => p.date >= from);
  if (pts.length < 2) return null;

  const x0 = pts[0].date;
  if (pts.length < 3) {
    const last = pts[pts.length - 1];
    const days = daysBetween(x0, last.date);
    return days > 0 ? (last.trend - pts[0].trend) / days : null;
  }

  const xs = pts.map((p) => daysBetween(x0, p.date));
  const ys = pts.map((p) => p.trend);
  const n = pts.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, b) => a + b * b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

/**
 * Date estimée à laquelle la tendance projetée (linéaire) atteint `target`
 * depuis `current` au rythme `slopePerDay`. Renvoie null si le rythme va à
 * l'opposé de la cible (jamais atteint).
 */
export function projectEta(
  current: number,
  target: number,
  slopeDay: number | null,
  fromDate: string,
): string | null {
  if (slopeDay == null || slopeDay === 0) return null;
  const remaining = target - current;
  if (remaining === 0) return fromDate;
  // Le rythme doit aller dans le sens de la cible.
  if (Math.sign(remaining) !== Math.sign(slopeDay)) return null;
  const days = Math.ceil(remaining / slopeDay);
  if (!Number.isFinite(days) || days < 0) return null;
  return addDays(fromDate, days);
}
