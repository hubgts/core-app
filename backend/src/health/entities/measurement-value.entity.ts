import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BodyMeasurementEntity } from './body-measurement.entity';

/**
 * Valeur d'une mensuration (cm) rattachée à un relevé.
 * Une seule valeur par couple (mesure, métrique).
 */
@Entity('measurement_values')
@Unique('uq_measurement_metric', ['measurementId', 'metricKey'])
export class MeasurementValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'measurement_id', type: 'uuid' })
  measurementId: string;

  @ManyToOne(() => BodyMeasurementEntity, (m) => m.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'measurement_id' })
  measurement?: BodyMeasurementEntity;

  /** Clé de métrique : `hips`, `arm`, `thigh`, `chest`… */
  @Column({ name: 'metric_key', type: 'varchar', length: 32 })
  metricKey: string;

  /** Valeur en cm. */
  @Column({ name: 'value_cm', type: 'numeric' })
  valueCm: number;
}
