import { BudgetCategoryKind } from './entities/budget-category.entity';
import { BudgetTransactionKind } from './entities/budget-transaction.entity';

export const CATEGORY_KINDS: BudgetCategoryKind[] = ['depense', 'epargne'];
export const TRANSACTION_KINDS: BudgetTransactionKind[] = ['entree', 'sortie'];

/** Statut d'une catégorie sur un mois (vs sa cible). */
export type CategoryStatus =
  'within' | 'over' | 'reached' | 'insufficient' | null;

export interface CategoryInput {
  name?: string;
  kind?: BudgetCategoryKind;
  color?: string;
  icon?: string;
}

/** Plan d'un mois : la part cible (%) de chaque catégorie incluse. */
export interface PlanInput {
  items?: { categoryId: string; targetPct?: number }[];
}

export interface TransactionInput {
  kind?: BudgetTransactionKind;
  date?: string;
  amount?: number;
  categoryId?: string | null;
  label?: string | null;
}

export interface BudgetSettingsInput {
  plannedIncome?: number | null;
}
