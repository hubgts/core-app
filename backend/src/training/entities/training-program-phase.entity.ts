import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingProgramEntity } from './training-program.entity';

/**
 * Phase (mésocycle) : regroupe des semaines consécutives et porte un objectif
 * hérité par ses semaines sans objectif propre.
 */
@Entity('training_program_phases')
export class TrainingProgramPhaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @ManyToOne(() => TrainingProgramEntity, (p) => p.phases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'program_id' })
  program?: TrainingProgramEntity;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  objective: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;
}
