import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingEventEntity } from './training-event.entity';
import { ExerciseSetEntity } from './exercise-set.entity';

@Entity('exercises')
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => TrainingEventEntity, (event) => event.exercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event?: TrainingEventEntity;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Nom normalisé (sans accents, minuscule) pour consolider les stats (RG-11). */
  @Index()
  @Column({ name: 'name_key', type: 'varchar', length: 60, default: '' })
  nameKey: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => ExerciseSetEntity, (set) => set.exercise)
  sets?: ExerciseSetEntity[];
}
