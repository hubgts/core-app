import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EnvelopeType } from '../types';
import { SnapshotEntity } from './snapshot.entity';

export type EnvelopeStatus = 'active' | 'archived';

@Entity('envelopes')
export class EnvelopeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Type d'enveloppe (immuable après création). La nature en découle. */
  @Column({ type: 'varchar' })
  type: EnvelopeType;

  @Column({ type: 'varchar', default: '' })
  color: string;

  @Column({ type: 'varchar', default: '' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  /** Objectif : montant cible (€), optionnel. null = pas d'objectif. */
  @Column({ name: 'target_amount', type: 'double precision', nullable: true })
  targetAmount: number | null;

  /** Échéance de l'objectif, format YYYY-MM-DD, optionnelle. */
  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: EnvelopeStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @OneToMany(() => SnapshotEntity, (snapshot) => snapshot.envelope)
  snapshots?: SnapshotEntity[];
}
