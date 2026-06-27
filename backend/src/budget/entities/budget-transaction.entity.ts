import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BudgetCategoryEntity } from './budget-category.entity';

export type BudgetTransactionKind = 'entree' | 'sortie';

/**
 * Mouvement daté : entrée (revenu) ou sortie (dépense / versement d'épargne).
 * Une sortie est rattachée à une catégorie ; une entrée n'en a pas.
 */
@Entity('budget_transactions')
export class BudgetTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  kind: BudgetTransactionKind;

  /** Date du mouvement, `YYYY-MM-DD`. Le mois (`YYYY-MM`) en est dérivé. */
  @Index()
  @Column({ type: 'date' })
  date: string;

  /** Montant en € (> 0) ; le `kind` porte le sens. */
  @Column({ type: 'double precision' })
  amount: number;

  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  // Empêche la suppression d'une catégorie référencée (cf. RG-09).
  @ManyToOne(() => BudgetCategoryEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: BudgetCategoryEntity | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
