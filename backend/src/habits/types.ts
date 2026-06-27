export type StreakUnit = 'days' | 'weeks';

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalChecks: number;
  /** Unité du streak : 'days' (quotidienne) ou 'weeks' (objectif hebdo). */
  streakUnit: StreakUnit;
  /** Nombre de coches de la semaine courante (lun→dim contenant aujourd'hui). */
  weekDone: number;
}
