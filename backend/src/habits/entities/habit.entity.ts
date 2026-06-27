import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HabitCheckEntity } from './habit-check.entity';

export type HabitStatus = 'active' | 'archived';

@Entity('habits')
export class HabitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  /** Objectif hebdomadaire : 1 à 7 fois/semaine. 7 = quotidienne. */
  @Column({ name: 'weekly_target', type: 'int', default: 7 })
  weeklyTarget: number;

  @Column({ type: 'varchar', default: '' })
  color: string;

  @Column({ type: 'varchar', default: '' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', default: 'active' })
  status: HabitStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @OneToMany(() => HabitCheckEntity, (check) => check.habit)
  checks?: HabitCheckEntity[];
}
