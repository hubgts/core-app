import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingProgramEntity } from './training-program.entity';
import { TrainingProgramPhaseEntity } from './training-program-phase.entity';
import { TrainingProgramSessionEntity } from './training-program-session.entity';

/**
 * Semaine (microcycle), indexée S1..Sn. Peut appartenir à une phase (ou à
 * aucune) et porter un objectif propre prioritaire sur celui de la phase.
 */
@Entity('training_program_weeks')
export class TrainingProgramWeekEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @ManyToOne(() => TrainingProgramEntity, (p) => p.weeks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program?: TrainingProgramEntity;

  @Column({ name: 'phase_id', type: 'uuid', nullable: true })
  phaseId: string | null;

  @ManyToOne(() => TrainingProgramPhaseEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'phase_id' })
  phase?: TrainingProgramPhaseEntity | null;

  /** Numéro 1-based → libellé « S{index} ». */
  @Column({ type: 'int' })
  index: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  objective: string | null;

  /** Semaine de décharge (marqueur informatif, aucun calcul). */
  @Column({ name: 'is_deload', type: 'boolean', default: false })
  isDeload: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => TrainingProgramSessionEntity, (s) => s.week)
  sessions?: TrainingProgramSessionEntity[];
}
