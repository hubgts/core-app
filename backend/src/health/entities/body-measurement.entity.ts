import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MeasurementValueEntity } from './measurement-value.entity';

/**
 * Un relevé daté du corps : poids et/ou une ou plusieurs mensurations.
 * Au plus une mesure par jour (date locale) — ressaisir un jour = édition.
 */
@Entity('body_measurements')
@Unique('uq_measurement_date', ['date'])
export class BodyMeasurementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Jour concerné, format YYYY-MM-DD (date locale, sans heure). */
  @Column({ type: 'date' })
  date: string;

  /** Poids en kg (1 décimale). `null` si la mesure ne porte que des mensurations. */
  @Column({ name: 'weight_kg', type: 'numeric', nullable: true })
  weightKg: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => MeasurementValueEntity, (v) => v.measurement)
  values?: MeasurementValueEntity[];
}
