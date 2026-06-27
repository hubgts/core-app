# Module Budget — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.0 · 2026-06-23
> Sous-module **Budget** du module **Finances** de l'application **Progression**.
> Nouvelle **page dédiée** (`/finances/budget`), 4ᵉ entrée du sous-menu Finances.
> Référence du périmètre global : [`mvp.md`](./mvp.md). Module patrimoine :
> [`module_finances.md`](./module_finances.md).
>
> Ce module **introduit volontairement la notion de transaction**, explicitement
> renvoyée hors du module Finances patrimonial (« le budget/dépenses fera l'objet d'un
> module séparé »). Les deux coexistent : **Finances = photographie du patrimoine**
> (soldes, sans transaction) ; **Budget = pilotage des flux du mois** (revenus,
> dépenses, allocation). **Les deux sont indépendants** (aucune synchronisation), cf.
> §9.

---

## 1. Intention & Philosophie

Le module Budget répond à une question simple : **« est-ce que je dépense mon argent
comme je l'avais prévu ce mois-ci ? »**. Il matérialise une **règle de répartition**
choisie en amont (le classique **50/30/20** — besoins / plaisirs / épargne — n'est qu'un
exemple) et la **confronte au réel**, au fil des saisies, via un **camembert** qui se
dessine en cours de mois.

La **marche à suivre** est en deux temps :

1. **Définir son plan** (une fois) : des **catégories** libres, chacune avec un **%
   cible**. La somme des cibles fait **100 %**. Exemple : `Besoins 50 % · Plaisirs 30 %
   · Épargne 20 %`, mais l'utilisateur est libre (3, 4, 5 catégories…).
2. **Vivre le mois** : on **renseigne son revenu du mois** (le salaire, + primes
   éventuelles) pour traduire le plan en **euros** (50 % de 2 000 € = 1 000 €), puis on
   **saisit ses transactions** (dépenses et versements d'épargne), chacune **rattachée à
   une catégorie**. À chaque saisie, le **camembert du réel se met à jour** et l'on voit
   immédiatement si l'on **respecte le plan**.

Trois principes directeurs :

1. **Le plan d'abord, le réel ensuite.** On déclare une intention (la répartition
   cible), puis on mesure l'écart. L'app ne juge pas : elle **montre l'écart**.
2. **Saisie au fil de l'eau.** Une transaction = `{ date, montant, catégorie }`. La
   visualisation est **immédiate** (camembert + barres par catégorie).
3. **Mensuel et répétable.** L'unité de pilotage est le **mois**. Le plan est
   **réutilisé** d'un mois sur l'autre ; seuls le **revenu** et les **transactions**
   changent.

> **Épargne = une catégorie comme une autre.** Conformément au choix retenu, un
> **versement d'épargne se saisit comme une transaction** (une « sortie » affectée à la
> catégorie Épargne), et non comme un reste calculé. Cela rend l'épargne **active et
> visible** dans le camembert, au même titre qu'une dépense.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Plan budgétaire** | L'ensemble des **catégories** et de leurs **% cibles**. Persistant, réutilisé chaque mois. La somme des cibles = **100 %**. |
| **Catégorie** | Un poste d'allocation **défini par l'utilisateur** (ex. Besoins, Plaisirs, Épargne), avec un **% cible**, une couleur et une icône. |
| **Mois budgétaire** | Période de pilotage, identifiée par `AAAA-MM`. Porte un **revenu** et des **transactions**. |
| **Revenu du mois** | Total des **entrées** du mois (salaire + primes…). Base de calcul des **cibles en euros**. |
| **Transaction** | Un mouvement daté : **entrée** (revenu) ou **sortie** (dépense / versement épargne). Une sortie est **rattachée à une catégorie**. |
| **Cible (€)** | Montant cible d'une catégorie pour le mois = `% cible × revenu du mois`. |
| **Réel (€)** | Somme des **sorties** affectées à la catégorie sur le mois. |
| **Reste à allouer** | `revenu du mois − Σ sorties du mois`. Ce qui n'est pas encore affecté. |
| **Écart** | `réel − cible` d'une catégorie (€ et points de %). Positif = au-delà de la cible. |
| **Camembert du réel** | Répartition des **sorties** du mois par catégorie (part de chaque catégorie dans le total dépensé/alloué). |

---

## 3. Périmètre

### Dans le périmètre (MVP)

- **Définir / éditer un plan** : catégories libres `{ nom, % cible, couleur, icône }`,
  somme des cibles = 100 % (assistance à l'équilibrage).
- **Sélectionner un mois** (mois courant par défaut, navigation ◀ ▶).
- **Renseigner le revenu du mois** (une ou plusieurs **entrées**).
- **Saisir des transactions** (sorties) **rattachées à une catégorie** ; éditer /
  supprimer.
- **Visualiser en temps réel** : **camembert du réel**, **cibles vs réel** par catégorie
  (€ et %), **reste à allouer**, signal de **dépassement**.
- **Comparer au plan** : voir d'un coup d'œil si la répartition réelle suit le plan
  (ex. 50/30/20).
- **100 % saisie manuelle**, euros.

### Hors périmètre (V2 — voir §10)

- **Sous-catégories** (deux niveaux) — le MVP est à **un seul niveau** de catégories.
- **Lien avec les enveloppes de patrimoine** (un versement épargne ne crée pas de relevé
  d'enveloppe) — module **autonome** (cf. §9).
- **Transactions récurrentes** / modèles ; **report** du non-dépensé d'un mois sur
  l'autre.
- **Plan daté par mois** (historiser les % au moment du mois) — le MVP applique le **plan
  courant** à chaque mois.
- **Import bancaire**, multi-devises, pièces jointes, étiquettes libres.
- **Agrégation Dashboard** multi-modules.

---

## 4. Modèle de données

Trois entités, indépendantes du patrimoine (`backend/src/finances/entities/`).
`synchronize: true` (pas de migration) ; montants en `double precision` (cohérent avec
l'existant) ; dates `AAAA-MM-DD`.

### 4.1 `BudgetCategoryEntity` → table `budget_categories`

Catalogue **partagé** entre les mois (le **% cible vit dans le plan mensuel**, §4.4).

| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(60)` | 1–60 car. Unique parmi les catégories actives (insensible casse). |
| `kind` | `kind` | `varchar` | `'depense' \| 'epargne'`. Défaut `'depense'`. Sémantique d'affichage (cf. RG-12). |
| `color` | `color` | `varchar` | Hex (défaut par index si absent). |
| `icon` | `icon` | `varchar` | Emoji optionnel. |
| `position` | `position` | `int` | Ordre d'affichage. |
| `status` | `status` | `varchar` | `'active' \| 'archived'`. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

### 4.4 `BudgetMonthPlanEntity` → table `budget_month_plans`

La part cible (%) d'une catégorie **pour un mois** — le « plan » d'un mois est l'ensemble
de ses lignes.

| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `month` | `month` | `varchar(7)` (indexé) | `AAAA-MM`. |
| `categoryId` | `category_id` | `uuid` (FK) | `ON DELETE CASCADE`. |
| `targetPct` | `target_pct` | `double` | % cible (0–100). |
| — | `uq_month_category` | unique | `(month, category_id)`. |

> **Plan = catégories partagées, % par mois.** Le catalogue (§4.1) est commun ; seuls le
> **% et la présence** d'une catégorie changent d'un mois à l'autre. La contrainte
> « somme = 100 % » est **applicative** (assistée, cf. RG-03), non bloquante.
>
> **Héritage** : un mois **sans** ligne **hérite** du dernier plan défini (mois le plus
> récent `<` mois, à défaut le plus récent) — calcul **applicatif**, sans copie en base.
> **Éditer** le plan d'un mois **matérialise** ses lignes (il devient indépendant).

### 4.2 `BudgetTransactionEntity` → table `budget_transactions`

| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `kind` | `kind` | `varchar` | `'entree'` (revenu) \| `'sortie'` (dépense/épargne). |
| `date` | `date` | `date` | `AAAA-MM-DD`. Le **mois** en est dérivé (`AAAA-MM`). |
| `amount` | `amount` | `double` | Montant **> 0** (le `kind` porte le sens). |
| `categoryId` | `category_id` | `uuid \| null` (FK, indexée) | **Obligatoire si `sortie`**, **null si `entree`**. `ON DELETE RESTRICT` (cf. RG-09). |
| `label` | `label` | `varchar(120) \| null` | Libellé optionnel (ex. « Courses Carrefour »). |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

> **Index** sur `date` (filtrage par mois) et `category_id`. Une **entrée** n'a pas de
> catégorie ; le revenu du mois = `Σ amount` des entrées du mois.

### 4.3 `BudgetSettingsEntity` → table `budget_settings` (singleton, optionnel)

Réglages globaux, même pattern que `FinancesSettingsEntity` (id fixe `'me'`). MVP :

| Propriété | Colonne | Type | Détails |
|---|---|---|---|
| `id` | `id` | `varchar` (PK) | `'me'`. |
| `plannedIncome` | `planned_income` | `double \| null` | **Revenu de référence** (salaire récurrent) pré-rempli pour un nouveau mois sans entrée. Optionnel. |
| `updatedAt` | `updated_at` | `timestamptz` | Auto. |

---

## 5. Architecture des écrans (UX/UI)

**Une page** : `/finances/budget` (sous-menu Finances → *Vue d'ensemble / Enveloppes /
Bilan du mois / **Budget***). Thème **dark-first**, cohérent avec le module.

### 5.1 Première visite — définir le plan (onboarding)

Si **aucune catégorie** n'existe :
- Un **écran d'amorçage** explique la marche à suivre et propose un **modèle 50/30/20**
  pré-rempli (Besoins 50 % · Plaisirs 30 % · Épargne 20 %) **modifiable**, + bouton
  « Partir d'un plan vierge ».
- L'utilisateur ajuste noms, %, couleurs, puis **valide** (la somme doit faire 100 %,
  cf. RG-03).

### 5.2 Écran principal du mois

De haut en bas :

1. **En-tête** : titre « 🎯 Budget » + **sélecteur de mois** (◀ *Juin 2026* ▶, défaut =
   mois courant). Le menu **⋮ (KebabMenu)** regroupe les actions secondaires : « Gérer
   les catégories », « Revenu de référence ».
2. **Bandeau revenu** : **Revenu du mois** (somme des entrées) + bouton **« + Revenu »**.
   S'il est à 0, message incitatif (« Renseignez votre revenu pour voir vos cibles en
   euros »).
3. **Synthèse plan vs réel** — la pièce maîtresse :
   - **Camembert du réel** (parts des sorties par catégorie, couleurs des catégories,
     hex concrets). Au centre : **total dépensé/alloué** du mois.
   - À côté, le **plan de référence** (mini-anneau ou jauge des **% cibles**) pour la
     **comparaison d'un coup d'œil**.
   - **Reste à allouer** mis en avant (`revenu − Σ sorties`).
4. **Détail par catégorie** (cartes ou lignes) : pour chaque catégorie,
   `réel € / cible €`, **barre de progression** (réel ÷ cible), **% réel du revenu vs %
   cible**, et un **état** (dans la cible / dépassement — cf. RG-12). Bouton rapide
   **« + Dépense »** pré-rempli sur la catégorie.
5. **Transactions du mois** : liste datée (entrées + sorties), montant, catégorie,
   libellé ; **éditer / supprimer**. Bouton principal **« + Dépense »** (et « + Revenu »).

### 5.3 Saisie d'une transaction (modale)

- **Type** : Dépense (défaut) / Revenu (bascule).
- **Montant** (€, saisie permissive), **Date** (défaut aujourd'hui, dans le mois
  sélectionné par défaut), **Catégorie** (obligatoire si Dépense ; masquée si Revenu),
  **Libellé** (optionnel).
- À l'enregistrement : **camembert + barres se redessinent immédiatement** (UI
  optimiste + toast), et le **reste à allouer** se met à jour.

### 5.4 Gérer les catégories (modale / sous-écran)

- Liste **réordonnable** (drag-drop, comme les enveloppes/habitudes) des catégories
  actives, avec **% cible**, couleur, icône.
- **Indicateur d'équilibrage** en direct : « Total : 100 % ✅ » / « 90 % — il manque
  10 % ⚠️ ».
- **Archiver** une catégorie (conserve ses transactions) ; **supprimer** seulement si
  **aucune** transaction ne la référence (sinon proposer l'archivage), cf. RG-09.

### 5.5 États vides & feedback

- **Pas de plan** → onboarding (§5.1).
- **Plan mais revenu = 0** → cibles en € masquées, on affiche les **% cibles** et le
  **réel en %** ; invite à saisir le revenu.
- **Aucune transaction** → camembert vide « Ajoutez une dépense pour démarrer ».

---

## 6. Règles de gestion détaillées

### Plan & catégories

- **RG-01** — Une catégorie a un **nom obligatoire** (≤ 60), un **% cible ≥ 0**, une
  **couleur** et une **icône** (défauts si absents). Le **plan** = catégories `active`.
- **RG-02** — Le **% cible** est un nombre **0–100**. Les valeurs sont libres ; aucune
  catégorie n'est imposée.
- **RG-03** — La **somme des % cibles** des catégories actives **devrait faire 100 %**.
  L'UI **assiste** l'équilibrage (total en direct, écart signalé) mais **n'empêche pas**
  d'enregistrer un total ≠ 100 % (avertissement non bloquant).
- **RG-04** — Le **plan est mensuel** : le **% (et la présence)** de chaque catégorie est
  propre au mois (`budget_month_plans`). Un mois **sans** plan **hérite** du dernier plan
  défini ; l'**éditer matérialise** ses lignes (devient indépendant). Les catégories
  (nom, couleur, type) restent **partagées** entre les mois.
- **RG-05** — **Réordonner** les catégories met à jour leur `position` (affichage,
  camembert, listes).

### Revenu & transactions

- **RG-06** — Une **transaction** a un **montant > 0**, une **date**, et un **type**
  (`entree` / `sortie`). Son **mois** est dérivé de la date (`AAAA-MM`).
- **RG-07** — Une **sortie** est **obligatoirement rattachée à une catégorie active** ;
  une **entrée** n'a **pas** de catégorie.
- **RG-08** — Le **revenu du mois** = `Σ montant` des **entrées** du mois. À défaut
  d'entrée, l'UI peut pré-remplir avec le **revenu de référence** (`plannedIncome`) sans
  créer de transaction.
- **RG-09** — Supprimer une **catégorie** est **interdit** si des transactions la
  référencent → proposer l'**archivage** (une catégorie archivée n'apparaît plus à la
  saisie, mais ses transactions et son histoire restent).
- **RG-10** — Saisie permissive des montants (`8200`, `8 200`, `8200,50`), **2 décimales
  max**, séparateurs FR. Dates passées ou du mois ; **future autorisée mais déconseillée**
  (avertissement non bloquant).

### Calculs (côté backend — aucun calcul métier au front)

- **RG-11** — Pour un mois M et une catégorie c :
  - **cible €** = `round2(targetPct_c / 100 × revenu(M))` (null/masquée si revenu = 0) ;
  - **réel €** = `Σ` des sorties de c sur M ;
  - **% réel du revenu** = `revenu(M) > 0 ? réel / revenu × 100 : null` ;
  - **part du camembert** = `réel / Σ sorties(M) × 100` ;
  - **écart €** = `réel − cible` ; **écart pts** = `% réel − % cible`.
- **RG-12** — **État d'une catégorie** (couleur/signal) :
  - `depense` : **dans la cible** si `réel ≤ cible`, **dépassement** si `réel > cible` ;
  - `epargne` : **atteinte** si `réel ≥ cible`, **insuffisante** si `réel < cible`
    (logique inversée : épargner *moins* que prévu est l'alerte).
- **RG-13** — **Reste à allouer** = `revenu(M) − Σ sorties(M)`. Peut être **négatif**
  (sur-dépense) → signalé.
- **RG-14** — Le **camembert** ne porte que sur les **sorties** (l'épargne y figure comme
  une part). Les **entrées** n'y figurent pas (elles définissent le total de référence).
- **RG-15** — Tous les agrégats sont **recalculés à l'affichage** depuis les
  transactions ; rien n'est figé.

---

## 7. Micro-interactions & Feedback

- **Redraw immédiat** du camembert et des barres à chaque ajout/suppression de
  transaction (UI optimiste, rollback + toast en cas d'erreur).
- **Dépassement** : la barre de la catégorie passe au rouge et déborde visuellement
  (clamp à 100 % avec marqueur « +X € »).
- **Reste à allouer négatif** : bandeau d'alerte « Vous avez dépassé votre revenu de
  X € ce mois-ci ».
- **Équilibrage du plan** : pastille temps réel « 100 % » verte / « 90 % » orange.
- **Changement de mois** : transition douce ; conserve la catégorie pré-sélectionnée pour
  la saisie rapide.

---

## 8. Accessibilité & Responsive

- Camembert **SVG fait main** (pas de librairie), **couleurs hex concrètes** (jamais
  `var()`), `role="img"` + `<title>` par part. Légende textuelle équivalente.
- Cartes catégories en **grille responsive** (1 colonne en mobile).
- Cibles atteignables au **clavier** ; champs avec libellés explicites ; contrastes
  dark-first respectés.
- Montants en **tabular-nums** ; signe et couleur ne sont jamais le **seul** vecteur
  d'information (texte « dépassement » / « dans la cible »).

---

## 9. Cas limites & Questions ouvertes

- **Revenu = 0** → cibles € masquées ; on raisonne en **% du dépensé** et on montre les
  **% cibles** (le plan reste lisible).
- **Total des cibles ≠ 100 %** → autorisé (RG-03) ; la comparaison reste valable (on
  compare % réel du revenu à % cible).
- **Catégorie archivée avec transactions** → ses transactions restent comptées dans
  l'historique des mois concernés ; elle n'apparaît plus à la saisie.
- **Transaction hors mois courant** → rattachée à son mois réel via la date (visible en
  changeant de mois).
- **Plan modifié en cours de mois** → les cibles du mois se recalculent **immédiatement**.
  Un mois **hérité** (jamais édité) suit le dernier plan ; le modifier le rend indépendant.
- **Lien avec le patrimoine (Finances)** — *décision : autonome*. Un versement « Épargne »
  **ne crée pas** de relevé d'enveloppe. Question ouverte V2 : proposer un **rapprochement
  optionnel** (« ce versement alimente l'enveloppe *Matelas de sécurité* ») sans coupler
  les deux modèles.
- **Plusieurs revenus** (salaire + prime) → gérés nativement (plusieurs entrées) ; le
  total sert de base aux cibles.

---

## 10. Backlog / Évolutions futures (V2+)

1. **Sous-catégories** (deux niveaux : poste → sous-catégories) pour ventiler finement.
2. **Report** du reste à allouer / sur-dépense d'un mois sur l'autre (« enveloppes
   budgétaires » à la YNAB).
3. **Transactions récurrentes** & modèles (loyer, abonnements).
4. **Rapprochement optionnel avec les enveloppes** de patrimoine (versement épargne →
   relevé d'enveloppe).
5. **Tendances multi-mois** : courbe du respect du plan, moyenne par catégorie, taux
   d'épargne dans le temps.
6. **Import bancaire** (catégorisation assistée), pièces jointes, étiquettes.
7. **Alertes** (catégorie bientôt dépassée) et **prévision de fin de mois**.

---

## 11. Critères d'acceptation (récapitulatif testable)

1. Je peux **créer un plan** de catégories avec des % cibles et voir un **indicateur
   d'équilibrage** (100 %). Le modèle **50/30/20** est proposé au démarrage.
2. Je peux **renseigner le revenu** du mois et voir chaque catégorie afficher sa **cible
   en euros** (`% × revenu`).
3. Je peux **ajouter une dépense** rattachée à une catégorie ; le **camembert du réel**
   et les **barres cible/réel** se mettent à jour **immédiatement**.
4. Je peux **saisir l'épargne comme une transaction** (catégorie Épargne) et la voir
   apparaître dans le camembert.
5. Je vois, par catégorie, **réel vs cible** (€ et %), l'**état** (dans la cible /
   dépassement) et le **reste à allouer** du mois.
6. Je peux **comparer** ma répartition réelle au **plan** (ex. 50/30/20) d'un coup d'œil.
7. Je peux **changer de mois** et retrouver le revenu/les transactions propres à ce mois.
8. Je peux **éditer/supprimer** une transaction et **archiver** une catégorie utilisée
   (suppression interdite si transactions liées).
9. Aucun **calcul métier au front** : cibles, écarts, parts et reste à allouer viennent
   du **backend**.
10. Le module **n'altère pas** le patrimoine (Finances) : aucun relevé d'enveloppe créé.

---

> **Découpage de livraison indicatif**
> 1. **Backend** : entités (`budget_categories`, `budget_transactions`, settings) + CRUD
>    + endpoint `GET /finances/budget/overview?month=` (plan, revenu, cibles/réel par
>    catégorie, camembert, reste à allouer).
> 2. **Plan** : onboarding 50/30/20 + gestion des catégories (équilibrage, drag-drop).
> 3. **Mois** : sélecteur, bandeau revenu, synthèse plan vs réel (camembert), détail par
>    catégorie, liste des transactions.
> 4. **Saisie** : modale transaction (UI optimiste) + redraw immédiat.
> 5. **Doc** : `docs/budget/utilisation.md` + `technique.md` (mêmes conventions repo).
