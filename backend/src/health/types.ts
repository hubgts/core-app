import { Sex } from './entities/health-profile.entity';
import { HealthGoalStatus } from './entities/health-goal.entity';

/**
 * Mensurations connues (clé → libellé/unité gérés côté front), orientées
 * musculation et triées de haut en bas du corps. La taille (stature) n'en fait
 * PAS partie : c'est une donnée fixe du profil (`HealthProfile.heightCm`).
 */
export const KNOWN_METRICS = [
  'neck',
  'shoulders',
  'chest',
  'arm',
  'forearm',
  'hips',
  'thigh',
  'calf',
] as const;
export type MetricKey = (typeof KNOWN_METRICS)[number];

export interface MeasurementInput {
  weightKg?: number | null;
  note?: string | null;
  /** Mensurations : { metricKey: valueCm }. */
  values?: Record<string, number | null>;
}

export interface ProfileInput {
  heightCm?: number | null;
  sex?: Sex | null;
  metrics?: string[];
}

export interface GoalInput {
  targetWeightKg?: number;
  targetDate?: string | null;
  startedAt?: string | null;
}

/** Un relevé renvoyé au client. */
export interface MeasurementDto {
  id: string;
  date: string;
  weightKg: number | null;
  note: string | null;
  values: Record<string, number>;
}

/** Série d'une métrique : valeur brute + tendance lissée par date. */
export interface SeriesPoint {
  date: string;
  value: number;
  trend: number;
}

/** Objectif décoré (progression / ETA / statut), aligné sur objectifs_epargne. */
export interface GoalDto {
  id: string;
  targetWeightKg: number;
  targetDate: string | null;
  startedAt: string;
  status: HealthGoalStatus;
  /** 'loss' si l'on vise plus léger, 'gain' sinon — sert au sens des Δ. */
  direction: 'loss' | 'gain';
  startWeightKg: number | null;
  /** Progression bornée [0,1], ou null si pas assez de données. */
  progress: number | null;
  /** Rythme de la tendance en kg/semaine (signé). */
  weeklyRateKg: number | null;
  /** Reste à parcourir (kg, valeur absolue). */
  remainingKg: number | null;
  /** Date estimée d'atteinte (YYYY-MM-DD) ou null si le rythme s'en éloigne. */
  eta: string | null;
  paceStatus: 'on_track' | 'behind' | 'reached' | 'no_pace';
  /** Effort requis kg/semaine pour tenir `targetDate` (si behind). */
  requiredWeeklyKg: number | null;
}

export interface HealthKpis {
  /** Poids « actuel » = dernière valeur de tendance (RG-03). */
  currentWeightKg: number | null;
  /** Dernière pesée brute (pour info). */
  lastRawWeightKg: number | null;
  delta7Kg: number | null;
  delta30Kg: number | null;
  deltaTotalKg: number | null;
  bmi: number | null;
  bmiLabel: string | null;
}

export interface HealthOverview {
  profile: {
    heightCm: number | null;
    sex: Sex | null;
    metrics: string[];
  };
  measurements: MeasurementDto[];
  /** Séries par métrique (clé `weight` pour le poids). */
  series: Record<string, SeriesPoint[]>;
  goal: GoalDto | null;
  kpis: HealthKpis;
  /** Dernière valeur connue par métrique de mensuration + Δ. */
  metricSummary: Record<
    string,
    { last: number | null; lastDate: string | null; delta: number | null }
  >;
}
