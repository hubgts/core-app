import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Réglages globaux du module Finances — singleton (id fixe). Porte l'objectif de
 * patrimoine net global (montant cible + échéance), tous deux optionnels.
 */
@Entity('finances_settings')
export class FinancesSettingsEntity {
  /** Singleton : une seule ligne, id constant. */
  @PrimaryColumn({ type: 'varchar', default: 'me' })
  id: string;

  /** Objectif de patrimoine net (€), optionnel. null = pas d'objectif. */
  @Column({
    name: 'net_worth_target',
    type: 'double precision',
    nullable: true,
  })
  netWorthTarget: number | null;

  /** Échéance de l'objectif net (YYYY-MM-DD), optionnelle. */
  @Column({ name: 'net_worth_target_date', type: 'date', nullable: true })
  netWorthTargetDate: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
