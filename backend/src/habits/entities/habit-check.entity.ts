import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { HabitEntity } from './habit.entity';

@Entity('habit_checks')
// Une seule coche par couple (habitude, jour). Décocher = supprimer la ligne.
@Unique('uq_habit_date', ['habitId', 'date'])
export class HabitCheckEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'habit_id', type: 'uuid' })
  habitId: string;

  @ManyToOne(() => HabitEntity, (habit) => habit.checks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'habit_id' })
  habit?: HabitEntity;

  /** Jour concerné, format YYYY-MM-DD (date locale, sans heure). */
  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
