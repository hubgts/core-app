import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Type de repas, géré par l'utilisateur. Amorcé avec un référentiel par défaut
 * puis librement créé / renommé / supprimé (RG-04/05). Unicité du nom
 * (insensible casse/accents) via `nameKey`.
 */
@Entity('meal_types')
@Unique('uq_meal_types_name', ['nameKey'])
export class MealTypeEntity {
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
