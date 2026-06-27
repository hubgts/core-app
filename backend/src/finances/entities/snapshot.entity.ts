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
import { EnvelopeEntity } from './envelope.entity';

@Entity('snapshots')
// Un seul relevé par couple (enveloppe, jour) : re-saisir une date écrase (RG-05).
@Unique('uq_envelope_date', ['envelopeId', 'date'])
export class SnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'envelope_id', type: 'uuid' })
  envelopeId: string;

  @ManyToOne(() => EnvelopeEntity, (envelope) => envelope.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'envelope_id' })
  envelope?: EnvelopeEntity;

  /** Date du relevé, format YYYY-MM-DD (date locale, sans heure). */
  @Column({ type: 'date' })
  date: string;

  /** Valeur / solde en € (≥ 0). Pour l'investissement : valeur de marché, PV incluses. */
  @Column({ type: 'double precision' })
  amount: number;

  /** Plus-value latente comprise dans `amount` (investissement). null sinon. */
  @Column({ type: 'double precision', nullable: true })
  gain: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
