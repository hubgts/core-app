/**
 * Utilitaires de dates calendaires (YYYY-MM-DD, sans heure).
 * On manipule les dates en UTC minuit pour éviter tout décalage lié au fuseau
 * ou au changement d'heure (DST).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = toUTC(s);
  return fmt(d) === s; // rejette les dates impossibles (ex : 2026-02-30)
}

export function toUTC(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

export function todayStr(): string {
  return fmt(new Date());
}

/** Lundi (ISO) de la semaine contenant la date donnée. */
export function mondayOf(s: string): string {
  const d = toUTC(s);
  const dow = d.getUTCDay(); // 0 = dimanche … 6 = samedi
  const diff = (dow + 6) % 7; // nb de jours écoulés depuis lundi
  d.setUTCDate(d.getUTCDate() - diff);
  return fmt(d);
}
