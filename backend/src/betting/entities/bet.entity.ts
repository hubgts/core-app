import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BankrollEntity } from './bankroll.entity';
import { SelectionEntity } from './selection.entity';
import { BetStatus, BetType } from '../types';

/** Un ticket de pari (simple ou combiné) rattaché à une bankroll. */
@Entity('bets')
export class BetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'bankroll_id', type: 'uuid' })
  bankrollId: string;

  @ManyToOne(() => BankrollEntity, (b) => b.bets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bankroll_id' })
  bankroll?: BankrollEntity;

  @Column({ type: 'varchar' })
  type: BetType;

  /** Mise engagée (€ > 0). */
  @Column({ type: 'double precision' })
  stake: number;

  /** Cote totale décimale (combiné = produit des sélections, void ⇒ 1,00). */
  @Column({ type: 'double precision' })
  odds: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: BetStatus;

  /** Retour si cash out. null sinon. */
  @Column({ name: 'cashout_amount', type: 'double precision', nullable: true })
  cashoutAmount: number | null;

  /** Commission (€, ex. cash out / exchange). */
  @Column({ type: 'double precision', default: 0 })
  commission: number;

  /** Cote de clôture, pour le CLV. null si non renseignée. */
  @Column({ name: 'closing_odds', type: 'double precision', nullable: true })
  closingOdds: number | null;

  /** Date de prise du pari (YYYY-MM-DD). */
  @Column({ name: 'placed_at', type: 'date' })
  placedAt: string;

  /** Date de règlement (YYYY-MM-DD). null tant que le pari est en cours. */
  @Column({ name: 'settled_at', type: 'date', nullable: true })
  settledAt: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => SelectionEntity, (s) => s.bet, { cascade: true })
  selections?: SelectionEntity[];
}
