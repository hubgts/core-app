/**
 * Utilitaires partagés de dates calendaires (`YYYY-MM-DD`, sans heure).
 *
 * L'arithmétique se fait en UTC minuit pour éviter tout décalage lié au
 * fuseau ou au changement d'heure (DST). Seules `todayStr()` et `dateOf()`
 * s'appuient sur l'heure LOCALE : « aujourd'hui » est le jour affiché par
 * l'horloge de l'utilisateur, pas le jour UTC.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

const pad = (n: number) => String(n).padStart(2, '0');

/** `true` si `s` est une date `YYYY-MM-DD` réelle (rejette 2026-02-30). */
export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  return fmt(toUTC(s)) === s;
}

/** `true` si `s` est un horaire `HH:MM` (24 h). */
export function isValidTimeStr(s: unknown): s is string {
  return typeof s === 'string' && TIME_RE.test(s);
}

/** `YYYY-MM-DD` → `Date` à minuit UTC. */
export function toUTC(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** `Date` → `YYYY-MM-DD` (composantes UTC). */
export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Compose une date `YYYY-MM-DD` à partir de (année, mois 1-12, jour). */
export function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Décale une date `YYYY-MM-DD` de `n` jours (calcul en UTC, sans fuseau). */
export function addDays(s: string, n: number): string {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Nombre de jours entre deux dates (`b − a`), peut être négatif. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** Lundi (ISO) de la semaine contenant la date donnée. */
export function mondayOf(s: string): string {
  const dow = toUTC(s).getUTCDay(); // 0 = dimanche … 6 = samedi
  return addDays(s, -((dow + 6) % 7));
}

/** Convertit un `Date` (timestamp réel) en `YYYY-MM-DD` LOCAL. */
export function dateOf(d: Date): string {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Date du jour (`YYYY-MM-DD`), en heure LOCALE. */
export function todayStr(): string {
  return dateOf(new Date());
}

/** Dernier jour du mois (month : 1-12), au format `YYYY-MM-DD`. */
export function lastDayOfMonth(year: number, month: number): string {
  return ymd(year, month, new Date(year, month, 0).getDate());
}

/** Décale un couple (année, mois 1-12) de `delta` mois. */
export function addMonthsYM(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
