// Métadonnées partagées du module Entraînement.

export const TYPE_META = {
  musculation: { icon: '💪', label: 'Musculation', color: '#818cf8' },
  cardio: { icon: '🏃', label: 'Cardio', color: '#38bdf8' },
  autre: { icon: '📝', label: 'Autre', color: '#34d399' },
};

export const TYPES = ['musculation', 'cardio', 'autre'];

// Préfixe/badge marquant une séance issue d'un programme dans le planning.
export const PROGRAM_BADGE = '▣';

// Jours de la semaine du programme : J1 = lundi … J7 = dimanche.
export const PROGRAM_DAYS = [
  { value: 1, code: 'J1', label: 'Lun' },
  { value: 2, code: 'J2', label: 'Mar' },
  { value: 3, code: 'J3', label: 'Mer' },
  { value: 4, code: 'J4', label: 'Jeu' },
  { value: 5, code: 'J5', label: 'Ven' },
  { value: 6, code: 'J6', label: 'Sam' },
  { value: 7, code: 'J7', label: 'Dim' },
];

// Barème des zones de fréquence cardiaque (Garmin) — sert à libeller le sélecteur.
export const CARDIO_ZONES = [
  { id: 'Z1', pct: '50–60 %', label: 'Récupération' },
  { id: 'Z2', pct: '60–70 %', label: 'Endurance fond.' },
  { id: 'Z3', pct: '70–80 %', label: 'Aérobie' },
  { id: 'Z4', pct: '80–90 %', label: 'Seuil' },
  { id: 'Z5', pct: '90–100 %', label: 'VO2max' },
];

// Plage horaire affichée dans les vues Jour / Semaine.
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;

export function tonnageOf(event) {
  return (event.exercises ?? []).reduce(
    (t, ex) => t + (ex.sets ?? []).reduce((st, s) => st + s.reps * s.weight, 0),
    0,
  );
}

// Résumé court d'un évènement pour les chips de calendrier.
export function eventChipLabel(event) {
  switch (event.type) {
    case 'musculation':
      return 'Musculation';
    case 'cardio':
      return event.zone ? `Cardio ${event.zone}` : 'Cardio';
    case 'autre':
      return event.title || 'Autre';
    default:
      return 'Séance';
  }
}

// Minutes depuis minuit pour un évènement horodaté (null si « journée »).
export function startMinutes(event) {
  if (!event.startTime) return null;
  const [h, m] = event.startTime.split(':').map(Number);
  return h * 60 + m;
}

// Tri d'affichage : horodatés d'abord (par heure), puis les « journée ».
export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const sa = startMinutes(a);
    const sb = startMinutes(b);
    if (sa == null && sb == null) return 0;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sa - sb;
  });
}
