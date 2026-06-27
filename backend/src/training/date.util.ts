/** Validation de dates/horaires pour le module Entraînement. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

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

export function isValidTimeStr(s: unknown): s is string {
  return typeof s === 'string' && TIME_RE.test(s);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Décale une date `YYYY-MM-DD` de `n` jours (calcul en UTC, sans fuseau). */
export function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Lundi (ISO) de la semaine contenant `dateStr`, au format `YYYY-MM-DD`. */
export function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche … 6 = samedi
  const diff = (dow + 6) % 7; // jours écoulés depuis lundi
  return addDaysStr(dateStr, -diff);
}
