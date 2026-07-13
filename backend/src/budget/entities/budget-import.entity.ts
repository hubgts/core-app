import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BudgetTransactionKind } from './budget-transaction.entity';

/** Statut d'un import bancaire (cf. §7 de la spec). */
export type BudgetImportStatus = 'pending' | 'validated' | 'error';

/**
 * Une ligne détectée dans le fichier, telle que présentée (et modifiable) dans la
 * modale de récapitulatif. Persistée en JSON tant que l'import est `pending` afin
 * de pouvoir rouvrir la vérification sans perdre la progression (§3/§7).
 */
export interface BudgetImportRow {
  /** Identifiant stable de la ligne dans le lot (index d'origine). */
  id: string;
  /** Numéro de ligne dans le fichier (1-based), pour les messages d'erreur. */
  sourceLine: number;
  /** Ligne brute d'origine (sert au calcul du `dedupKey`). */
  raw: string;
  kind: BudgetTransactionKind | null;
  /** `YYYY-MM-DD` ou `null` si indéterminé. */
  date: string | null;
  /** Montant en € (> 0) ; le `kind` porte le sens. `null` si indéterminé. */
  amount: number | null;
  categoryId: string | null;
  label: string | null;
  /**
   * Signature de marchand (cf. `merchantKey`) : regroupe les opérations
   * similaires pour la catégorisation en masse. `null` si indéterminable.
   */
  merchantKey: string | null;
  /**
   * Empreinte anti-doublon (cf. `BudgetTransactionEntity.dedupKey`).
   * `null` si la ligne n'a pas de date/montant exploitables au parsing.
   */
  dedupKey: string | null;
  /** Erreur bloquante attachée à la ligne (format illisible, montant/date invalide…). */
  error: string | null;
  /** Ligne exclue de l'import par l'utilisateur (§8). */
  ignored: boolean;
  /** `true` si une transaction identique existe déjà (ré-import) → ignorée à la validation. */
  duplicate: boolean;
}

/**
 * Lot d'import bancaire : un fichier déposé, son format détecté, son statut et
 * l'ensemble de ses lignes. Table `budget_imports`.
 */
@Entity('budget_imports')
export class BudgetImportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nom du fichier déposé. */
  @Column({ type: 'varchar', length: 260 })
  fileName: string;

  /** Clé du format détecté (ex. `societe-generale-csv`). */
  @Column({ name: 'format_key', type: 'varchar', length: 60 })
  formatKey: string;

  /** Libellé lisible du format (ex. « Société Générale CSV »). */
  @Column({ name: 'format_label', type: 'varchar', length: 120 })
  formatLabel: string;

  @Index()
  @Column({ type: 'varchar', length: 12, default: 'pending' })
  status: BudgetImportStatus;

  /** Message d'erreur global (import `error` non lisible, cf. §8). `null` sinon. */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /** Lignes détectées (draft éditable). Vidé/figé une fois l'import `validated`. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  rows: BudgetImportRow[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
