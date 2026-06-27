import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type Sex = 'f' | 'm';

/**
 * Profil santé — singleton (id fixe). Sert uniquement à dériver l'IMC et à
 * configurer la liste des mensurations suivies. Jamais bloquant.
 */
@Entity('health_profile')
export class HealthProfileEntity {
  /** Singleton : une seule ligne, id constant. */
  @PrimaryColumn({ type: 'varchar', default: 'me' })
  id: string;

  /** Taille en cm — pour l'IMC. Optionnel. */
  @Column({ name: 'height_cm', type: 'numeric', nullable: true })
  heightCm: number | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  sex: Sex | null;

  /** Mensurations suivies / affichées (sous-ensemble configurable). */
  @Column({ type: 'jsonb', default: () => `'[]'` })
  metrics: string[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
