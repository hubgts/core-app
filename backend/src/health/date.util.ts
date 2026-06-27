/**
 * Utilitaires de dates calendaires (YYYY-MM-DD, sans heure), en UTC minuit
 * pour éviter tout décalage de fuseau / DST. Calqué sur habits/date.util.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = toUTC(s);
  return fmt(d) === s;
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

/** Nombre de jours entre deux dates (b - a), peut être négatif. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}
