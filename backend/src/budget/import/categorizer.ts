import { normalizeText } from '../../common/text.util';
import { BudgetCategoryEntity } from '../entities/budget-category.entity';

/**
 * Règles de catégorisation **best effort** : associe des mots-clés présents dans
 * le libellé d'une transaction à un **nom de catégorie canonique**. La résolution
 * finale vers une catégorie existante du plan est faite par `categorize()`
 * (rapprochement souple sur le nom). En cas d'échec → `null`, sans bloquer (§2).
 *
 * Les mots-clés sont comparés en minuscules, sans accents. Ordonner du plus
 * spécifique au plus générique n'est pas nécessaire (première correspondance).
 */
interface Rule {
  /** Nom canonique de catégorie visé (rapproché des catégories du plan). */
  category: string;
  keywords: string[];
}

const RULES: Rule[] = [
  {
    category: 'Logement',
    keywords: ['giboire', 'loyer', 'credipar', 'eau du bassin', 'engie', 'ovh'],
  },
  {
    category: 'Courses',
    keywords: [
      'leclerc',
      'super u',
      'station u',
      'carrefour',
      'dac carrefour',
      'lagarde and son',
      'action',
      'la fabrique',
      'delices',
      'chocolateri',
    ],
  },
  {
    category: 'Restaurant',
    keywords: [
      'burger king',
      'mc donald',
      'dominos',
      'il toscano',
      'contrescarpe',
      'bistroquet',
      'reine de coeur',
      'la chocolateri',
    ],
  },
  {
    category: 'Transport',
    keywords: ['leclerc station', 'lavage', 'geb lavage', 'station'],
  },
  {
    category: 'Assurance',
    keywords: ['maaf', 'axa', 'sogarep', 'assurance'],
  },
  {
    category: 'Télécom',
    keywords: ['sfr', 'sfrenligne', 'free', 'orange'],
  },
  {
    category: 'Santé',
    keywords: [
      'radiologie',
      'idilbi',
      'anatole',
      'bernardin',
      'massage',
      'herve massage',
      'cpam',
    ],
  },
  {
    category: 'Loisirs',
    keywords: [
      'padel',
      'urbansoccer',
      'vbmc',
      'orange bleue',
      'ob rennes',
      'stade rennais',
      'kervel',
      '3set',
      'hello asso',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon',
      'paypal',
      'orchestra',
      'timberland',
      'sephora',
      'lush',
      'aroma-zone',
      'ikea',
      'truffaut',
      'leroy merlin',
      'darty',
      'but',
      'planity',
      'coiffeur',
    ],
  },
  {
    category: 'Épargne',
    keywords: ['bourse direct', 'boursorama', 'epargne'],
  },
  {
    category: 'Abonnements',
    keywords: ['leetchi', 'sumup', 'zettle'],
  },
];

// Règles pré-normalisées une fois au chargement (elles sont constantes).
const NORM_RULES = RULES.map((r) => ({
  target: normalizeText(r.category),
  keywords: r.keywords.map(normalizeText),
}));

/** Catégorie du plan pré-normalisée (construite une fois par import). */
export interface CategoryRef {
  id: string;
  norm: string;
}

/** Pré-normalise les catégories actives pour les appels répétés à `categorize`. */
export function buildCategoryIndex(
  categories: BudgetCategoryEntity[],
): CategoryRef[] {
  return categories.map((c) => ({ id: c.id, norm: normalizeText(c.name) }));
}

/**
 * Devine la catégorie d'une transaction à partir de son libellé. Retourne l'`id`
 * d'une catégorie **active** existante, ou `null` (best effort, jamais bloquant).
 *
 * 1. Détermine le nom canonique via les règles de mots-clés.
 * 2. Rapproche ce nom des catégories du plan (égalité, puis inclusion souple).
 */
export function categorize(
  label: string | null,
  categories: CategoryRef[],
): string | null {
  if (!label) return null;
  const hay = normalizeText(label);
  const target = NORM_RULES.find((r) =>
    r.keywords.some((k) => hay.includes(k)),
  )?.target;
  if (!target) return null;

  const exact = categories.find((c) => c.norm === target);
  if (exact) return exact.id;
  const loose = categories.find(
    (c) => c.norm.includes(target) || target.includes(c.norm),
  );
  return loose?.id ?? null;
}
