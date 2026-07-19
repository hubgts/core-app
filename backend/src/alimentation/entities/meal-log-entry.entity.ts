import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Nature d'une entrée du journal : recette consommée ou aliment brut. */
export type MealLogKind = 'recipe' | 'food';

/**
 * Une entrée du journal alimentaire : ce qui a été mangé un jour donné, à une
 * heure optionnelle. L'entrée référence une recette OU un aliment, mais fige au
 * moment de l'ajout son libellé et ses macros (snapshot) — modifier ou supprimer
 * la recette/l'aliment source ensuite ne change pas l'historique. Ajouter deux
 * fois le même plat crée deux entrées indépendantes.
 */
@Entity('meal_log_entries')
export class MealLogEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Jour de consommation (date locale, sans heure). */
  @Index()
  @Column({ type: 'date' })
  date: string;

  /** Heure (HH:MM) ou null → entrée « sans heure » (placée en tête du jour). */
  @Column({ type: 'varchar', length: 5, nullable: true })
  time: string | null;

  @Column({ type: 'varchar' })
  kind: MealLogKind;

  /** Recette source (FK souple), si `kind = 'recipe'`. Peut pointer une recette
   *  supprimée depuis — le snapshot `label`/macros reste valable. */
  @Column({ name: 'recipe_id', type: 'uuid', nullable: true })
  recipeId: string | null;

  /** Nombre de portions consommées, si `kind = 'recipe'`. */
  @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true })
  servings: number | null;

  /** Aliment source (FK souple), si `kind = 'food'`. */
  @Column({ name: 'food_id', type: 'uuid', nullable: true })
  foodId: string | null;

  /** Quantité consommée en g/ml, si `kind = 'food'`. */
  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  quantity: number | null;

  /** Unité de la quantité (g/ml), figée depuis l'aliment ; null pour recette. */
  @Column({ type: 'varchar', length: 2, nullable: true })
  unit: string | null;

  /** Libellé figé (nom de la recette / de l'aliment au moment de l'ajout). */
  @Column({ type: 'varchar', length: 120 })
  label: string;

  // --- Snapshot des macros de l'entrée (déjà multipliées par portions/quantité) ---
  @Column({ type: 'numeric', precision: 8, scale: 1, default: 0 })
  carbs: number;

  @Column({ type: 'numeric', precision: 8, scale: 1, default: 0 })
  protein: number;

  @Column({ type: 'numeric', precision: 8, scale: 1, default: 0 })
  fat: number;

  @Column({ type: 'numeric', precision: 8, scale: 1, default: 0 })
  kcal: number;

  /** Ordre au sein d'un même jour (départage les entrées de même heure). */
  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
