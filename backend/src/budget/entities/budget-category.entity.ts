import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type BudgetCategoryKind = 'depense' | 'epargne';
export type BudgetCategoryStatus = 'active' | 'archived';

/**
 * Catégorie d'allocation du budget (poste de la répartition cible, ex. Besoins,
 * Plaisirs, Épargne). Le « plan » = l'ensemble des catégories actives.
 */
@Entity('budget_categories')
export class BudgetCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Sémantique d'affichage : dépense (sous la cible = OK) ou épargne (au-dessus = OK). */
  @Column({ type: 'varchar', default: 'depense' })
  kind: BudgetCategoryKind;

  @Column({ type: 'varchar', default: '' })
  color: string;

  @Column({ type: 'varchar', default: '' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', default: 'active' })
  status: BudgetCategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
