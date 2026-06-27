import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Rayon de magasin, géré par l'utilisateur. Amorcé par un référentiel par
 * défaut puis librement créé / renommé / réordonné / supprimé (RG-04/05).
 * `position` porte l'ordre de parcours en magasin (RG-08). Unicité du nom
 * (insensible casse/accents) via `nameKey`.
 */
@Entity('course_aisles')
@Unique('uq_course_aisles_name', ['nameKey'])
export class AisleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  /** Nom normalisé (sans accents, minuscule) garantissant l'unicité. */
  @Column({ name: 'name_key', type: 'varchar', length: 40 })
  nameKey: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  icon: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  color: string;

  /** true pour les entrées issues du référentiel amorcé (repère, non bloquant). */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  /** Ordre de parcours en magasin. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
