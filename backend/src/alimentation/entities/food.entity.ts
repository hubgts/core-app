import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** Unité de référence des macros : valeurs exprimées pour 100 (g ou ml). */
export type FoodUnit = 'g' | 'ml';

/**
 * Aliment (ingrédient) du référentiel nutritionnel : macronutriments pour 100
 * g/ml et calories dérivées. Réutilisé en liste stricte dans les recettes pour
 * calculer leur apport (glucides / protéines / lipides / kcal). Unicité du nom
 * (insensible casse/accents) via `nameKey`.
 *
 * `kcal` est dérivé des macros (4·glucides + 4·protéines + 9·lipides) et stocké
 * au save pour servir d'affichage / tri sans recalcul.
 */
@Entity('foods')
@Unique('uq_foods_name', ['nameKey'])
export class FoodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Nom normalisé (sans accents, minuscule) garantissant l'unicité. */
  @Column({ name: 'name_key', type: 'varchar', length: 80 })
  nameKey: string;

  /** Base des macros : 'g' (solide, pour 100 g) ou 'ml' (liquide, pour 100 ml). */
  @Column({ type: 'varchar', length: 2, default: 'g' })
  unit: FoodUnit;

  /** Glucides pour 100 g/ml. */
  @Column({ type: 'numeric', precision: 7, scale: 2, default: 0 })
  carbs: number;

  /** Protéines pour 100 g/ml. */
  @Column({ type: 'numeric', precision: 7, scale: 2, default: 0 })
  protein: number;

  /** Lipides pour 100 g/ml. */
  @Column({ type: 'numeric', precision: 7, scale: 2, default: 0 })
  fat: number;

  /** Calories pour 100 g/ml, dérivées des macros au save. */
  @Column({ type: 'numeric', precision: 7, scale: 1, default: 0 })
  kcal: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
