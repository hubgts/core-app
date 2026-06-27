import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Réglages globaux du budget — singleton (id fixe `'me'`). Porte le revenu de
 * référence (pré-remplissage d'un mois sans entrée).
 */
@Entity('budget_settings')
export class BudgetSettingsEntity {
  @PrimaryColumn({ type: 'varchar', default: 'me' })
  id: string;

  /** Revenu mensuel de référence (€), optionnel. */
  @Column({ name: 'planned_income', type: 'double precision', nullable: true })
  plannedIncome: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
