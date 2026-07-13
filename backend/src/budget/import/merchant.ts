import { normalizeText } from '../../common/text.util';

/**
 * Extrait une **signature de marchand** stable d'un libellé bancaire, pour
 * regrouper les opérations « similaires » (même commerçant/émetteur) et proposer
 * une catégorisation en masse dans l'écran de vérification.
 *
 * Les libellés portent beaucoup de bruit variable (références, dates, numéros de
 * carte/mandat, identifiants IOPD…). On isole la partie **nom** :
 *  - `CARTE X7264 10/07 LAGARDE AND SON 1106191…IOPD` → `lagarde and son`
 *  - `PRELEVEMENT EUROPEEN … DE: MAAF ASSURANCES SA ID: …` → `maaf assurances sa`
 *  - `VIR RECU … DE: 6TM GROUP SAS MOTIF: …` → `6tm group sas`
 *
 * Best effort : si rien ne se dégage, on retombe sur une version dépouillée des
 * premiers mots. Deux libellés donnant la même clé sont considérés « similaires ».
 */
export function merchantKey(label: string | null): string | null {
  if (!label) return null;
  let s = ` ${normalizeText(label)} `;

  // Retire les préfixes techniques les plus courants.
  s = s
    .replace(/\bcarte\s+x?\d+\b/g, ' ') // CARTE X7264
    .replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ') // dates JJ/MM(/AAAA)
    .replace(/\b\d{2}:\d{2}\b/g, ' ') // heures
    .replace(/\d{6,}\s*iopd\b/g, ' ') // identifiant carte « 1106191…IOPD »
    .replace(/\biopd\b/g, ' ')
    .replace(/\bcommerce electronique\b/g, ' ')
    .replace(/\bid:\s*[a-z0-9]+/g, ' ') // ID: FR38ZZZ…
    .replace(/\bref:.*$/g, ' ') // REF: … (jusqu'à la fin)
    .replace(/\bmotif:.*$/g, ' ') // MOTIF: … (jusqu'à la fin)
    .replace(/\bdate:.*$/g, ' ');

  // Isole ce qui suit « DE: » ou « POUR: » (émetteur/bénéficiaire d'un virement).
  const de = s.match(/\b(?:de|pour):\s*([a-z0-9 .*'-]+?)\s{2,}/);
  if (de) s = de[1];

  // Retire les mots « techniques » et les tokens purement numériques longs.
  const stop = new Set([
    'prelevement',
    'europeen',
    'europe',
    'ponctuel',
    'vir',
    'inst',
    're',
    'recu',
    'instantane',
    'emis',
    'logitel',
    'wero',
    'sepa',
    'prlv',
    'europ',
    'de',
    'pour',
    'sa',
    'sarl',
    'sas',
    's',
    'et',
    'cie',
  ]);
  const tokens = s
    .split(/[\s.*]+/)
    .map((t) => t.replace(/[^a-z0-9']/g, ''))
    .filter(
      (t) =>
        t.length > 1 &&
        !stop.has(t) &&
        !/^\d{4,}$/.test(t) && // longs numéros
        !/^(?=.*\d)[a-z0-9]{8,}$/.test(t), // longs identifiants alphanumériques
    );

  const key = tokens.slice(0, 4).join(' ').trim();
  return key || null;
}
