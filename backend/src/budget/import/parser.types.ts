import { BudgetTransactionKind } from '../entities/budget-transaction.entity';

/**
 * Ligne brute extraite d'un fichier bancaire, avant catégorisation et
 * validation applicative. Un parser ne produit **que** ces champs objectifs ;
 * la catégorie (best effort) et le contrôle de cohérence sont faits en aval par
 * le service.
 */
export interface ParsedRow {
  /** Numéro de ligne dans le fichier (1-based), pour les messages d'erreur. */
  sourceLine: number;
  /** Ligne brute d'origine (sert au calcul du `dedupKey`). */
  raw: string;
  kind: BudgetTransactionKind | null;
  /** `YYYY-MM-DD` ou `null` si illisible. */
  date: string | null;
  /** Montant en € (> 0), le signe est porté par `kind`. `null` si illisible. */
  amount: number | null;
  label: string | null;
  /** Erreur bloquante de ligne (montant/date illisible, colonne manquante…). */
  error: string | null;
}

/** Résultat de l'analyse d'un fichier par un parser. */
export interface ParseResult {
  rows: ParsedRow[];
}

/**
 * Erreur bloquante **globale** : le fichier ne correspond pas au format ou est
 * totalement illisible. L'import est alors marqué `error` sans lignes (§8).
 */
export class ImportFormatError extends Error {}

/**
 * Stratégie de parsing d'un format bancaire. Architecture extensible : ajouter
 * une banque/format = ajouter une implémentation et l'enregistrer dans le
 * registre (`parsers.ts`).
 */
export interface BankParser {
  /** Clé stable persistée (ex. `societe-generale-csv`). */
  readonly key: string;
  /** Libellé lisible (ex. « Société Générale CSV »). */
  readonly label: string;
  /** Heuristique de détection : ce parser reconnaît-il ce contenu ? */
  canParse(content: string, fileName: string): boolean;
  /** Analyse le contenu. Lève `ImportFormatError` si globalement illisible. */
  parse(content: string): ParseResult;
}
