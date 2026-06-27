/** Validation et arithmétique de dates pour le module Finances. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayStr(): string {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Dernier jour du mois (month : 1-12), au format YYYY-MM-DD. */
export function lastDayOfMonth(year: number, month: number): string {
  return ymd(year, month, new Date(year, month, 0).getDate());
}

/** Décale un couple (année, mois) de `delta` mois. month : 1-12. */
export function addMonthsYM(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Nombre de jours calendaires de `from` à `to` (positif si `to` est après). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

/** Décale une date `YYYY-MM-DD` de `n` jours. */
export function addDaysStr(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
