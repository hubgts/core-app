export type TrainingType = 'musculation' | 'cardio' | 'autre';

export const TRAINING_TYPES: TrainingType[] = [
  'musculation',
  'cardio',
  'autre',
];

export type CardioZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export const CARDIO_ZONES: CardioZone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];

// --- DTO d'entrée (création / édition) ---

export interface SetInput {
  reps: number;
  weight: number;
}

export interface ExerciseInput {
  name: string;
  sets: SetInput[];
}

export interface EventInput {
  date?: string;
  type?: TrainingType;
  startTime?: string | null;
  durationMin?: number | null;
  feeling?: number | null;
  // musculation
  exercises?: ExerciseInput[];
  // cardio
  zone?: CardioZone | null;
  // cardio / autre
  description?: string | null;
  // autre
  title?: string | null;
}

// --- DTO template (modèle de séance réutilisable) ---

export interface TemplateInput {
  name?: string;
  type?: TrainingType;
  tags?: string[];
  durationMin?: number | null;
  feeling?: number | null;
  // cardio
  zone?: CardioZone | null;
  // autre
  title?: string | null;
  // cardio / autre
  description?: string | null;
  // musculation
  exercises?: ExerciseInput[];
}

// --- DTO programme (cycle réutilisable : phases → semaines → séances) ---

export interface ProgramSessionInput {
  dayOfWeek: number; // 1 = lundi … 7 = dimanche
  label?: string | null;
  type?: TrainingType;
  startTime?: string | null;
  durationMin?: number | null;
  feeling?: number | null;
  // cardio
  zone?: CardioZone | null;
  // autre
  title?: string | null;
  // cardio / autre
  description?: string | null;
  // musculation
  exercises?: ExerciseInput[];
  sourceTemplateId?: string | null;
}

export interface ProgramWeekInput {
  index?: number; // 1-based ; à défaut, position dans la liste
  phaseIndex?: number | null; // position de la phase dans `phases` (null = hors phase)
  objective?: string | null;
  isDeload?: boolean;
  sessions?: ProgramSessionInput[];
}

export interface ProgramPhaseInput {
  name?: string;
  objective?: string | null;
}

export interface ProgramInput {
  name?: string;
  description?: string | null;
  phases?: ProgramPhaseInput[];
  weeks?: ProgramWeekInput[];
}

export interface StartProgramInput {
  startDate?: string; // YYYY-MM-DD
}

// --- Sortie ---

export interface PrReached {
  exerciseName: string;
  weight: number;
}
