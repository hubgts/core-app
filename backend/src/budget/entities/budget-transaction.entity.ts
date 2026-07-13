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

/** Longueur max d'un libellé de transaction (colonne `label`). */
export const LABEL_MAX = 120;

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
  @ManyToOne(() => BudgetCategoryEntity, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category?: BudgetCategoryEntity | null;

  @Column({ type: 'varchar', length: LABEL_MAX, nullable: true })
  label: string | null;

  /**
   * Empreinte anti-doublon des transactions issues d'un import bancaire
   * (`hash(date + montant signé + libellé brut de la ligne)`, cf. module Import).
   * `null` pour les saisies manuelles. Unique quand renseignée (garantit
   * l'idempotence des ré-imports).
   */
  @Index({ unique: true, where: '"dedup_key" IS NOT NULL' })
  @Column({ name: 'dedup_key', type: 'varchar', length: 64, nullable: true })
  dedupKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
