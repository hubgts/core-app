/**
 * Normalise un texte pour une comparaison souple : minuscules, sans accents.
 * Helper partagé — plusieurs services répètent encore cet idiome inline ;
 * les faire converger ici au fil de l'eau.
 */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
