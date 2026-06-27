export type EnvelopeType =
  | 'especes'
  | 'compte_courant'
  | 'epargne'
  | 'investissement'
  | 'dette';

export const ENVELOPE_TYPES: EnvelopeType[] = [
  'especes',
  'compte_courant',
  'epargne',
  'investissement',
  'dette',
];

export type Nature = 'actif' | 'passif';

/** La nature découle du type : seule la dette est un passif (RG-01). */
export function natureOf(type: EnvelopeType): Nature {
  return type === 'dette' ? 'passif' : 'actif';
}

// --- DTO d'entrée ---

export interface EnvelopeInput {
  name?: string;
  type?: EnvelopeType;
  color?: string;
  icon?: string;
  // Solde initial (matérialise le premier relevé à la création).
  initialAmount?: number;
  initialGain?: number | null;
  initialDate?: string;
  // Objectif (optionnels) : montant cible et échéance. null pour effacer.
  targetAmount?: number | null;
  targetDate?: string | null;
}

export interface SnapshotInput {
  amount?: number;
  /** Plus-value latente, comprise dans `amount` (investissement uniquement). */
  gain?: number | null;
  note?: string | null;
}

/** Réglages globaux du module (objectif de patrimoine net). */
export interface SettingsInput {
  netWorthTarget?: number | null;
  netWorthTargetDate?: string | null;
}

/** Saisie groupée (« bilan du mois ») : un relevé par enveloppe à une même date. */
export interface BulkSnapshotInput {
  date?: string;
  items?: {
    envelopeId: string;
    amount?: number;
    gain?: number | null;
    note?: string | null;
  }[];
}
