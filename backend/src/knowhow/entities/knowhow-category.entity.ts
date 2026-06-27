import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Catégorie de savoir-faire, gérée par l'utilisateur. Amorcée avec un
 * référentiel par défaut puis librement créée / renommée / supprimée (RG-04/05).
 * Unicité du nom (insensible casse/accents) via `nameKey`.
 */
@Entity('knowhow_categories')
@Unique('uq_knowhow_categories_name', ['nameKey'])
export class KnowHowCategoryEntity {
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

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
