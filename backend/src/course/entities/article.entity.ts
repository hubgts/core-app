import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Article du référentiel : la désignation normalisée de ce qu'on achète
 * (« lait demi-écrémé », « tomates »). Porte la **mesure** par défaut (`unit`)
 * et le **rayon** par défaut (`aisleId`). Créé à la volée depuis l'ajout d'item
 * ou l'import de recette (RG-17/18). Unicité du nom (insensible casse/accents)
 * via `nameKey`.
 */
@Entity('course_articles')
@Unique('uq_course_articles_name', ['nameKey'])
export class ArticleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Nom normalisé (sans accents, minuscule) garantissant l'unicité. */
  @Column({ name: 'name_key', type: 'varchar', length: 60 })
  nameKey: string;

  /** Mesure par défaut (`g`, `kg`, `L`, `unité`…). Vide = sans mesure. */
  @Column({ type: 'varchar', length: 24, default: '' })
  unit: string;

  /** Rayon par défaut (FK souple) ; null = « Autre ». Mis à null si le rayon
   *  est supprimé (RG-05, géré côté service). */
  @Index()
  @Column({ name: 'aisle_id', type: 'uuid', nullable: true })
  aisleId: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
