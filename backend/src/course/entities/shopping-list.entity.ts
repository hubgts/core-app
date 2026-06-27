import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Item embarqué d'une liste de courses (ordre = position dans le tableau).
 * Référence un article (`articleId`) qui porte la désignation, et — par défaut
 * — la mesure et le rayon. La mesure de l'item (`unit`) est surchargeable.
 */
export interface ShoppingItem {
  id: string;
  articleId: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  checked: boolean;
  /** Recette d'origine si l'item vient d'un import (traçabilité). */
  sourceRecipeId: string | null;
}

/**
 * Une liste de courses : un titre, un statut, des items cochables. Les items
 * sont embarqués en JSON (liste ordonnée possédée par la liste). Compteurs et
 * regroupement par rayon sont calculés à la lecture (RG-11), via le référentiel
 * d'articles côté service.
 */
@Entity('course_lists')
export class ShoppingListEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  /** Date associée à la liste (optionnelle), au format `YYYY-MM-DD`. */
  @Column({ type: 'varchar', length: 10, nullable: true })
  date: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: ShoppingItem[];

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
