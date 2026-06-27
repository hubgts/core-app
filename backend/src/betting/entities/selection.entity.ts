import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BetEntity } from './bet.entity';
import { SelectionStatus } from '../types';

/** Une sélection (leg) d'un ticket : sport, évènement, marché, choix, cote. */
@Entity('selections')
export class SelectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'bet_id', type: 'uuid' })
  betId: string;

  @ManyToOne(() => BetEntity, (b) => b.selections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bet_id' })
  bet?: BetEntity;

  /** Sport (référentiel `sport` : MMA, Football…). */
  @Column({ type: 'varchar', length: 80 })
  sport: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  event: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  market: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  pick: string | null;

  @Column({ type: 'double precision' })
  odds: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: SelectionStatus;

  @Column({ type: 'int', default: 0 })
  position: number;
}
