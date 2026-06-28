// Utilitaires de dates calendaires côté client (YYYY-MM-DD, date locale).

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

// Initiale du jour de semaine, index 0 = dimanche.
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const pad = (n) => String(n).padStart(2, '0');

export function ymd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayStr() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// month : 1-12
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function monthLabel(year, month) {
  return `${MONTHS_FR[month - 1]} ${year}`;
}

export function weekdayInitial(year, month, day) {
  return WEEKDAY_INITIALS[new Date(year, month - 1, day).getDay()];
}

export function isWeekend(year, month, day) {
  const wd = new Date(year, month - 1, day).getDay();
  return wd === 0 || wd === 6;
}

export function addMonths(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const MONTHS_SHORT_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jui',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export function monthShort(month) {
  return MONTHS_SHORT_FR[month - 1];
}

// Lundi (ISO) de la semaine contenant la date locale donnée, au format YYYY-MM-DD.
export function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = dimanche … 6 = samedi
  const diff = (dow + 6) % 7; // jours écoulés depuis lundi
  date.setDate(date.getDate() - diff);
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

// Liste des jours (YYYY-MM-DD) d'un mois donné.
export function monthDates(year, month) {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => ymd(year, month, i + 1));
}

// Numéro de jour de semaine local : 0 = lundi … 6 = dimanche.
export function isoWeekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

// Décale une date (YYYY-MM-DD) de n jours.
export function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

// Les 7 jours (lundi → dimanche) de la semaine contenant `dateStr`.
export function weekDatesOf(dateStr) {
  const mon = mondayOf(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDaysStr(mon, i));
}

// La grille mensuelle complète (6 semaines = 42 jours), commençant un lundi.
export function monthGridDates(year, month) {
  const start = mondayOf(ymd(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => addDaysStr(start, i));
}

const WEEKDAYS_FR = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

// "samedi 14 juin 2026"
export function frenchFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${WEEKDAYS_FR[isoWeekday(dateStr)]} ${d} ${MONTHS_FR[m - 1].toLowerCase()} ${y}`;
}

// "14 juin" (sans année)
export function frenchDayMonth(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_FR[m - 1].toLowerCase()}`;
}

// "déc. 2026" (mois abrégé + année)
export function frenchMonthYear(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT_FR[m - 1]}. ${y}`;
}

export function monthYear(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
}
