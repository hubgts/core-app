import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type HealthGoalStatus = 'active' | 'reached' | 'archived';

/**
 * Objectif de poids — au plus un `active` à la fois. Créer un nouvel objectif
 * archive le précédent.
 */
@Entity('health_goals')
export class HealthGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Poids visé (kg). */
  @Column({ name: 'target_weight_kg', type: 'numeric' })
  targetWeightKg: number;

  /** Échéance souhaitée (optionnelle), YYYY-MM-DD. */
  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: string | null;

  /** Ancrage du calcul de progression (défaut : 1ʳᵉ mesure ≥ création). */
  @Column({ name: 'started_at', type: 'date' })
  startedAt: string;

  @Column({ type: 'varchar', default: 'active' })
  status: HealthGoalStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
