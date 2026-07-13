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

// ---------------------------------------------------------------------------
// Import bancaire
// ---------------------------------------------------------------------------

/** Dépôt d'un fichier à importer. */
export interface ImportUploadInput {
  fileName?: string;
  /** Contenu texte du fichier (le front lit le fichier et envoie son texte). */
  content?: string;
}

/** Une ligne éditée dans la modale de récapitulatif (§3). */
export interface ImportRowInput {
  id: string;
  kind?: BudgetTransactionKind | null;
  date?: string | null;
  amount?: number | null;
  categoryId?: string | null;
  label?: string | null;
  /** L'utilisateur exclut cette ligne de l'import (§8). */
  ignored?: boolean;
}

/** Enregistrement de la progression de vérification (sans valider). */
export interface ImportPatchInput {
  rows?: ImportRowInput[];
}
