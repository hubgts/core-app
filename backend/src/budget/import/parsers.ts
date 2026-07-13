import { BankParser } from './parser.types';
import { SocieteGeneraleCsvParser } from './societe-generale.parser';

/**
 * Registre des parsers bancaires. Ajouter un format = pousser une implémentation
 * de `BankParser` ici. La détection teste chaque parser via `canParse`.
 */
export const PARSERS: BankParser[] = [new SocieteGeneraleCsvParser()];

/** Retourne le premier parser reconnaissant le contenu, ou `null`. */
export function detectParser(
  content: string,
  fileName: string,
): BankParser | null {
  return PARSERS.find((p) => p.canParse(content, fileName)) ?? null;
}
