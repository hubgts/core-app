import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Élément d'un référentiel (liste de valeurs réutilisables).
 * `kind` distingue les référentiels (ex. « exercise » pour les exercices de
 * musculation). L'unicité porte sur (kind, nameKey) → un même libellé ne peut
 * exister qu'une fois par référentiel (insensible casse/accents).
 */
@Entity('reference_items')
@Unique('uq_reference_items_kind_name', ['kind', 'nameKey'])
export class ReferenceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 40 })
  kind: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Nom normalisé (sans accents, minuscule) garantissant l'unicité. */
  @Column({ name: 'name_key', type: 'varchar', length: 80 })
  nameKey: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
