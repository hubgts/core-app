import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainingType } from '../types';
import { ExerciseEntity } from './exercise.entity';

@Entity('training_events')
export class TrainingEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD (date locale, sans heure)

  @Column({ type: 'varchar' })
  type: TrainingType;

  /** Horaire de début (HH:MM) ou null → évènement « journée ». */
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

  // --- programme (snapshot figé au démarrage, aucun lien vivant) ---
  /** Nom du programme d'origine, ou null si séance hors programme. */
  @Column({ name: 'program_label', type: 'varchar', length: 80, nullable: true })
  programLabel: string | null;

  /** Objectif résolu (semaine sinon phase) figé au démarrage. */
  @Column({ name: 'program_objective', type: 'varchar', length: 120, nullable: true })
  programObjective: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ExerciseEntity, (exercise) => exercise.event)
  exercises?: ExerciseEntity[];
}
