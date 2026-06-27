import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainingProgramPhaseEntity } from './training-program-phase.entity';
import { TrainingProgramWeekEntity } from './training-program-week.entity';

/**
 * Programme / cycle réutilisable : un modèle ordonné de phases → semaines →
 * séances, indépendant du calendrier tant qu'il n'est pas « démarré » (le
 * démarrage copie de vraies séances dans le planning — cf. ProgramService).
 */
@Entity('training_programs')
export class TrainingProgramEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Clé normalisée du nom (recherche insensible casse/accents). */
  @Index()
  @Column({ name: 'name_key', type: 'varchar', length: 80, default: '' })
  nameKey: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => TrainingProgramPhaseEntity, (p) => p.program)
  phases?: TrainingProgramPhaseEntity[];

  @OneToMany(() => TrainingProgramWeekEntity, (w) => w.program)
  weeks?: TrainingProgramWeekEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
