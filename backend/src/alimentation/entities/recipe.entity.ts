import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RecipeDifficulty } from '../types';

export type RecipeStatus = 'active' | 'archived';

/** Ingrédient embarqué (ordre = position dans le tableau). */
export interface RecipeIngredient {
  id: string;
  quantity: number | null;
  unit: string | null;
  label: string;
  note: string | null;
}

/** Étape embarquée (ordre = position dans le tableau). */
export interface RecipeStep {
  id: string;
  text: string;
}

/**
 * Une recette : ingrédients + étapes, avec métadonnées culinaires (portions,
 * temps de préparation / cuisson / repos, difficulté). Ingrédients, étapes et
 * labels sont embarqués en JSON (listes ordonnées possédées par la recette).
 * Le temps total n'est pas stocké : il est calculé à la lecture (RG-17).
 */
@Entity('recipes')
export class RecipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Type de repas (FK souple) ; null = « sans type ». Mis à null si le type
   *  est supprimé (RG-04, géré côté service). */
  @Index()
  @Column({ name: 'meal_type_id', type: 'uuid', nullable: true })
  mealTypeId: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  labels: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  ingredients: RecipeIngredient[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: RecipeStep[];

  /** Nombre de portions de référence, base de la mise à l'échelle. */
  @Column({ type: 'int', nullable: true })
  servings: number | null;

  @Column({ name: 'prep_time_min', type: 'int', nullable: true })
  prepTimeMin: number | null;

  @Column({ name: 'cook_time_min', type: 'int', nullable: true })
  cookTimeMin: number | null;

  @Column({ name: 'rest_time_min', type: 'int', nullable: true })
  restTimeMin: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  difficulty: RecipeDifficulty | null;

  @Column({ type: 'varchar', length: 16, default: '' })
  color: string;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', default: 'active' })
  status: RecipeStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Géré manuellement : seules les éditions de contenu le bumpent (RG-08) —
   *  épingler / archiver / réordonner ne le touchent pas. */
  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
