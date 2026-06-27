import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExerciseEntity } from './exercise.entity';

@Entity('exercise_sets')
export class ExerciseSetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId: string;

  @ManyToOne(() => ExerciseEntity, (exercise) => exercise.sets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise?: ExerciseEntity;

  @Column({ type: 'int' })
  reps: number;

  /** Charge en kg (0 autorisé = poids du corps). */
  @Column({ type: 'double precision' })
  weight: number;

  @Column({ type: 'int', default: 0 })
  position: number;
}
