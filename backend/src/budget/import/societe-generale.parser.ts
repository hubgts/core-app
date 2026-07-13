import { isValidDateStr } from '../../common/date.util';
import { round2 } from '../../common/round.util';
import { normalizeText } from '../../common/text.util';
import { LABEL_MAX } from '../entities/budget-transaction.entity';
import {
  BankParser,
  ImportFormatError,
  ParsedRow,
  ParseResult,
} from './parser.types';

/**
 * Reconnaît la ligne d'en-tête de l'export SG de façon **robuste à l'encodage**.
 * Les exports SG sont en ISO-8859-1 : décodés en UTF-8 par le navigateur, les
 * accents deviennent des `�`. On compare donc sur une forme dépouillée (minuscule,
 * accents/caractères de remplacement retirés) et on exige les mots-clés stables
 * de l'en-tête, dans un CSV à `;` d'au moins 5 colonnes.
 */
function isHeaderLine(line: string): boolean {
  if (line.split(';').length < 5) return false;
  const flat = normalizeText(line).replace(/�/g, ''); // + caractère de remplacement
  return (
    flat.includes('date de l') &&
    flat.includes('montant de l') &&
    flat.includes('devise')
  );
}

/**
 * Parser de l'export **Société Générale** — format « Tableau », CSV, séparateur
 * point-virgule.
 *
 * Structure du fichier :
 *  - 1re ligne : métadonnées du compte (`="0126…";01/02/2026;…`) — ignorée ;
 *  - ligne d'en-tête (cf. `HEADER`) — repérée puis ignorée ;
 *  - lignes de données : `date;libellé;détail;montant;devise`.
 *
 * Montant en notation française (`-76,85`) : **négatif = dépense** (`sortie`),
 * **positif = revenu** (`entree`). Le `détail` (plus riche) sert de libellé s'il
 * est présent, sinon le `libellé`.
 */
export class SocieteGeneraleCsvParser implements BankParser {
  readonly key = 'societe-generale-csv';
  readonly label = 'Société Générale CSV';

  canParse(content: string): boolean {
    return normalize(content).some((l) => isHeaderLine(l));
  }

  parse(content: string): ParseResult {
    const lines = normalize(content);
    const headerIdx = lines.findIndex((l) => isHeaderLine(l));
    if (headerIdx === -1) {
      throw new ImportFormatError(
        'En-tête Société Générale introuvable : le fichier ne correspond pas au format attendu (export « Tableau » CSV).',
      );
    }

    const rows: ParsedRow[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const raw = lines[i];
      if (raw.trim() === '') continue;
      rows.push(this.parseLine(raw, i + 1));
    }

    if (rows.length === 0) {
      throw new ImportFormatError(
        'Aucune transaction trouvée après l’en-tête du fichier.',
      );
    }
    return { rows };
  }

  private parseLine(raw: string, sourceLine: number): ParsedRow {
    const cols = raw.split(';');
    const base: ParsedRow = {
      sourceLine,
      raw,
      kind: null,
      date: null,
      amount: null,
      label: null,
      error: null,
    };
    if (cols.length < 4) {
      return { ...base, error: 'Ligne mal formée (colonnes manquantes).' };
    }

    const date = parseFrDate(cols[0]);
    if (!date) {
      return {
        ...base,
        error: `Date illisible : « ${cols[0].trim()} » (JJ/MM/AAAA attendu).`,
      };
    }

    const signed = parseFrAmount(cols[3]);
    if (signed === null || signed === 0) {
      return {
        ...base,
        date,
        error: `Montant invalide : « ${cols[3].trim()} ».`,
      };
    }

    const detail = (cols[2] ?? '').trim();
    const libelle = (cols[1] ?? '').trim();
    const label = (detail || libelle).slice(0, LABEL_MAX) || null;

    return {
      ...base,
      date,
      kind: signed < 0 ? 'sortie' : 'entree',
      amount: round2(Math.abs(signed)),
      label,
    };
  }
}

/** Découpe en lignes, gère CRLF/BOM. */
function normalize(content: string): string[] {
  return content.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
}

/** `JJ/MM/AAAA` → `YYYY-MM-DD` (ou `null` si invalide). */
function parseFrDate(str: string): string | null {
  const m = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isValidDateStr(iso) ? iso : null;
}

/** `-1 199,44` / `-76,85` → `-1199.44` / `-76.85` (ou `null`). */
function parseFrAmount(str: string): number | null {
  const cleaned = str
    .trim()
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(',', '.');
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
