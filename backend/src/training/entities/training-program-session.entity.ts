import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingType } from '../types';
import { ExerciseInput } from '../types';
import { TrainingProgramWeekEntity } from './training-program-week.entity';

/**
 * Séance planifiée d'un programme, attachée à un jour de semaine (1 = lundi …
 * 7 = dimanche). Le contenu (exercices) est sérialisé en JSON, comme un
 * template : un programme n'est qu'un modèle, pas une séance horodatée.
 */
@Entity('training_program_sessions')
export class TrainingProgramSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'week_id', type: 'uuid' })
  weekId: string;

  @ManyToOne(() => TrainingProgramWeekEntity, (w) => w.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'week_id' })
  week?: TrainingProgramWeekEntity;

  /** Jour de la semaine : 1 = lundi … 7 = dimanche. */
  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar' })
  type: TrainingType;

  /** Nom court facultatif (ex. « Push A »). */
  @Column({ type: 'varchar', length: 60, nullable: true })
  label: string | null;

  /** Horaire optionnel ; null → séance « journée » (défaut). */
  @Column({ name: 'start_time', type: 'varchar', length: 5, nullable: true })
  startTime: string | null;

  @Column({ name: 'duration_min', type: 'int', nullable: true })
  durationMin: number | null;

  @Column({ type: 'int', nullable: true })
  feeling: number | null;

  // --- cardio ---
  @Column({ type: 'varchar', length: 2, nullable: true })
  zone: string | null;

  // --- autre ---
  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  // --- cardio / autre ---
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // --- musculation : exercices/séries sérialisés ---
  @Column({ type: 'jsonb', nullable: true })
  exercises: ExerciseInput[] | null;

  /** Traçabilité « importé depuis ce template » (non contraignant). */
  @Column({ name: 'source_template_id', type: 'uuid', nullable: true })
  sourceTemplateId: string | null;
}
