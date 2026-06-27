import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BetEntity } from './bet.entity';

export type BankrollStatus = 'active' | 'archived';

/** Conteneur de paris doté d'un capital de départ. Porte les statistiques. */
@Entity('bankrolls')
export class BankrollEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Capital de départ (€ ≥ 0), immuable après création (RG-01). */
  @Column({ name: 'starting_capital', type: 'double precision', default: 0 })
  startingCapital: number;

  @Column({ type: 'varchar', default: '' })
  bookmaker: string;

  @Column({ type: 'varchar', default: '' })
  color: string;

  @Column({ type: 'varchar', default: '' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', default: 'active' })
  status: BankrollStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @OneToMany(() => BetEntity, (bet) => bet.bankroll)
  bets?: BetEntity[];
}
