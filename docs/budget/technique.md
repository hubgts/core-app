# Module Budget — Documentation technique

> Fonctionnement **côté code** du sous-module Budget. Usage : [`utilisation.md`](./utilisation.md).
> ⚠️ Décrit **uniquement ce qui est implémenté**.

---

## 1. Vue d'ensemble

Module **autonome** côté backend (`backend/src/budget/`), exposé sous le préfixe
**`/finances/budget`**. Indépendant du module Finances (patrimoine) : aucune relation de
données. Le **cœur des calculs est côté backend** (`BudgetService`) ; le front affiche et
trace (camembert SVG réutilisé du module Finances).

Frontend : **menu dédié « Budget »** dans `Layout.jsx` (icône 🎯), avec deux onglets :
- **Vue d'ensemble** — `pages/CashflowPage.jsx`, route **`/budget`** (cash-flow du mois) ;
- **Plan & dépenses** — `pages/BudgetPage.jsx`, route **`/budget/plan`** (plan vs réel,
  saisie).

L'ancienne route `/finances/budget` **redirige** vers `/budget/plan`. TypeORM
`synchronize: true` → tables créées au démarrage.

---

## 2. Modèle de données

Trois entités dans `backend/src/budget/entities/`.

### `BudgetCategoryEntity` → `budget_categories`
Catalogue **partagé** entre les mois (le % cible vit dans `budget_month_plans`).
| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(60)` | Unique parmi les actives (insensible casse, applicatif). |
| `kind` | `kind` | `varchar` | `'depense' \| 'epargne'` (sémantique d'état). |
| `color` / `icon` | idem | `varchar` | Affichage (couleur hex pour le SVG). |
| `position` | `position` | `int` | Ordre (réordonnable). |
| `status` | `status` | `varchar` | `'active' \| 'archived'`. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

### `BudgetMonthPlanEntity` → `budget_month_plans`
La part cible (%) d'une catégorie **pour un mois** (le « plan » du mois).
| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `month` | `month` | `varchar(7)` (indexé) | `YYYY-MM`. |
| `categoryId` | `category_id` | `uuid` (FK) | **`ON DELETE CASCADE`**. |
| `targetPct` | `target_pct` | `double` | Part cible (0–100). |
| — | `uq_month_category` | unique | `(month, category_id)`. |

> **Héritage** : un mois **sans** ligne hérite du **dernier plan défini** (mois le plus
> récent `<` mois, à défaut le plus récent). C'est purement **applicatif** (pas de copie
> en base) ; éditer le plan d'un mois **matérialise** ses lignes (`setMonthPlan`).

### `BudgetTransactionEntity` → `budget_transactions`
| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `kind` | `kind` | `varchar` | `'entree'` (revenu) \| `'sortie'` (dépense/épargne). |
| `date` | `date` | `date` (indexée) | `YYYY-MM-DD` ; le mois en dérive. |
| `amount` | `amount` | `double` | **> 0**. |
| `categoryId` | `category_id` | `uuid \| null` (FK, indexée) | Obligatoire si `sortie`. **`ON DELETE RESTRICT`**. |
| `label` | `label` | `varchar(120) \| null` | Libellé optionnel. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

### `BudgetSettingsEntity` → `budget_settings`
Singleton (`id = 'me'`). `plannedIncome` (`double \| null`) = revenu de référence ;
`updatedAt`.

> Le **plan** n'est pas une entité : c'est l'ensemble des catégories `active`. La
> contrainte « somme = 100 % » est **applicative** (assistée, non bloquante).

---

## 3. API REST (préfixe `/finances/budget`)

Contrôleur `backend/src/budget/budget.controller.ts`.

| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/overview` | `?month=YYYY-MM` | Plan vs réel du mois : `income`, `totalSpent`, `remaining`, `planTotalPct`, `categories[]`, `pie[]`, `transactions[]`. |
| `GET` | `/cashflow` | `?month=YYYY-MM` | Flux du mois : `income`, `expenses`, `net`, `savings`, `savingsRate`, `carryIn`, `endBalance`, `previousMonth`, `history[]`, `pie[]`, `hasData` (cf. §4 bis). |
| `GET` · `PUT` | `/settings` | `{ plannedIncome? }` | Revenu de référence (singleton). |
| `GET` | `/plan` | `?month=` | Plan du mois (toutes les catégories actives + `inPlan`/`targetPct`, `inherited`/`source`). |
| `PUT` | `/plan` | `?month=` · `{ items:[{ categoryId, targetPct }] }` | Définit (matérialise) le plan du mois (remplace ses lignes). |
| `GET` | `/categories` | `?includeArchived=` | Liste des catégories (catalogue). |
| `POST` | `/categories` | `CategoryInput` | Crée une catégorie. |
| `PUT` | `/categories/reorder` | `{ ids }` | Réordonne (**avant** `:id`). |
| `PATCH` | `/categories/:id` | `CategoryInput` | Édite. |
| `POST` | `/categories/:id/archive` · `/unarchive` | — | Archive / réactive. |
| `DELETE` | `/categories/:id` | — | Supprime (**refusé** si transactions liées). |
| `GET` | `/transactions` | `?month=` | Transactions décorées du mois. |
| `POST` | `/transactions` | `TransactionInput` | Crée → renvoie l'`overview` du mois. |
| `PATCH` · `DELETE` | `/transactions/:id` | — | Édite / supprime → renvoie l'`overview`. |

### Validation (`400`)
- `name` non vide ≤ 60, unique (actives) ; `targetPct` ∈ [0, 100] ; `kind` ∈
  {depense, epargne} ; montant **> 0** ; `date` `YYYY-MM-DD` ; `month` `YYYY-MM`.
- Une **sortie** exige une `categoryId` **active** ; une **entrée** n'a pas de catégorie.
- Suppression de catégorie **refusée** si des transactions la référencent (→ archiver).

---

## 4. Calculs (`BudgetService.overview`)

Montants **arrondis à 2 décimales** (`round2`). Pour un mois M :
- Le **plan effectif** du mois (`effectivePlan`) fournit le `targetPct` de chaque
  catégorie (lignes propres, sinon héritées). `overview` renvoie aussi `hasPlan`,
  `planInherited`, `planSource`.
- `income` = Σ des **entrées** du mois ; `totalSpent` = Σ des **sorties**.
- Par catégorie : `targetEur = targetPct != null && income > 0 ? pct/100 × income : null` ;
  `real = Σ sorties(cat)` ; `realPctOfIncome = real / income × 100` ;
  `sharePct = real / totalSpent × 100` (part du camembert) ; `ecartEur = real − targetEur`.
- **État** (`state`) : `depense` → `within`/`over` (`real ≶ targetEur`) ;
  `epargne` → `reached`/`insufficient` (logique inversée). `null` si revenu = 0.
- `remaining = income − totalSpent` ; `planTotalPct` = Σ des `targetPct` du plan du mois.
- `pie` = catégories avec `real > 0` (`{ key, label, color, total, pct }`), triées desc —
  format **directement consommable par le `Donut`** générique de Finances.
- Catégories affichées (`categories`) = **dans le plan du mois** ∪ celles **ayant des
  sorties** (avec `inPlan`). `allCategories` = catalogue actif (menu de saisie).
- Le mois d'une transaction dérive de sa **date** (`Between(start, end)` du mois).

### 4 bis. Calculs cash-flow (`BudgetService.cashflow`)

Charge **toutes** les transactions `date ≤ fin de mois` (`LessThanOrEqual`) + le catalogue,
puis agrège **par mois** (entrées, sorties, dont versements en catégories *épargne*) :

- `income` = Σ entrées du mois ; `expenses` = Σ sorties ; `net = income − expenses`.
- `savings` = Σ sorties affectées à une catégorie **`kind = 'epargne'`** ;
  `savingsRate = income > 0 ? savings / income × 100 : null` (**taux d'épargne**).
- `carryIn` (**report**) = Σ des `net` de **tous les mois strictement antérieurs** ;
  `endBalance = carryIn + net` (solde de fin de mois).
- `previousMonth = { month, net }` du mois immédiatement précédent (0 si vide).
- `history` = 6 mois (du plus ancien au courant) `{ month, income, expenses, net }`.
- `pie` = sorties du mois par catégorie `{ key, label, color, total, pct }` (format `Donut`).
- `hasData` = `income > 0 || expenses > 0 || carryIn ≠ 0`.

Le report est **purement calculé** (pas de matérialisation en base). Le mois est décalé via
`addMonthsYM` (helper `shiftMonth` local au service).

---

## 5. Frontend — structure

```
api/budget.js                         # endpoints budget (helper request() partagé)
pages/CashflowPage.jsx / .css         # /budget : cash-flow (flux, taux d'épargne, report)
pages/BudgetPage.jsx / .css           # /budget/plan : mois, revenu, synthèse, transactions
components/budget/
  constants.js                        # palette, plan 50/30/20, monthLabel/shiftMonth, statusMeta, clampPct
                                      # (réexporte formatEur/formatSignedEur/trendClass de Finances)
  MonthNav.jsx                        # navigateur de mois ◀ Mars 2026 ▶ (partagé Cashflow/Budget)
  CashflowChart.jsx                   # histogramme entrées vs sorties (SVG, couleurs hex)
  TransactionModal.jsx                # saisie dépense / revenu
  CategoriesModal.jsx                 # éditeur du plan (catégories, équilibrage, drag-drop, revenu réf.)
```

- `BudgetPage` charge `GET /overview?month=` (rechargé au changement de mois et après
  chaque mutation). **Onboarding** si aucune catégorie. Synthèse = **`Donut`** (réutilisé
  de `components/finances/`, parts `pie`) + barres **Plan vs réel** (marqueur de cible).
- Mises à jour **optimistes** (création/suppression de transaction → l'`overview` renvoyé
  par l'API rafraîchit l'écran) + toast.
- `CategoriesModal` édite le **plan du mois sélectionné** : cases « inclure », % du mois
  (`PUT /plan?month=`), + le **catalogue partagé** (nom/couleur/icône/type via PATCH,
  ajout, archivage, drag-drop) et le **revenu de référence** (`PUT /settings`). Une note
  signale un plan **hérité** d'un autre mois.
- Couleurs SVG/barres en **hex concret** (jamais `var()`), thème **dark-first**.

---

## 6. Hors périmètre (cf. spec §10)

Sous-catégories, transactions récurrentes, rapprochement avec les enveloppes de
patrimoine, import bancaire. (Le **plan par mois** et le **report de trésorerie** —
solde cumulé inter-mois affiché par la vue d'ensemble, §4 bis — sont désormais
implémentés.) Voir [`specs/module_budget.md`](../../specs/module_budget.md).
