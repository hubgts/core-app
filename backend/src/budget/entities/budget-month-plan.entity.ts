import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BudgetCategoryEntity } from './budget-category.entity';

/**
 * Part cible (%) d'une catégorie pour un **mois** donné. Le plan d'un mois = ses
 * lignes. Un mois sans ligne **hérite** du dernier plan défini (calcul applicatif) ;
 * éditer le plan d'un mois matérialise ses lignes.
 */
@Entity('budget_month_plans')
@Unique('uq_month_category', ['month', 'categoryId'])
export class BudgetMonthPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Mois `YYYY-MM`. */
  @Index()
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => BudgetCategoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: BudgetCategoryEntity;

  /** Part cible du revenu, en % (0–100). */
  @Column({ name: 'target_pct', type: 'double precision', default: 0 })
  targetPct: number;
}
