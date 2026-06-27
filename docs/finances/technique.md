# Module Finances — Documentation technique

> Comment le module fonctionne **côté code**. Pensé pour être compris par un·e
> développeur·euse, même junior. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Vue d'ensemble

Trois services Docker Compose (cf. doc Habitudes pour le détail commun) :

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | React 18 + Vite | `5173` | Vue d'ensemble, courbe, donut, détail. |
| **backend** | NestJS (Node 18, TS) | `3000` | API REST + calculs (net, répartition, évolution). |
| **db** | PostgreSQL 16 | `5432` (interne) | Persistance enveloppes / relevés. |

Le **cœur des calculs est côté backend** (`FinancesService`) : net, plus-values,
répartition, courbe d'évolution. Le frontend affiche et trace (SVG « fait main »).

### Démarrage
```bash
make init       # build + démarrage
make dc-restart # redémarre SANS rebuild
```
> `Dockerfile` frontend = `COPY . .` puis `npm run dev` : code figé au build → après
> modification, **reconstruire** l'image. TypeORM crée les tables au démarrage
> (`synchronize: true`).

---

## 2. Modèle de données

Deux entités, dans `backend/src/finances/entities/`.

### `EnvelopeEntity` → table `envelopes`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(60)` | 1–60 car. Unique parmi les actives (insensible casse, applicatif). |
| `type` | `type` | `varchar` | `especes\|compte_courant\|epargne\|investissement\|dette`. **Immuable**. |
| `color` / `icon` | idem | `varchar` | Affichage (défaut par type si absent). |
| `position` | `position` | `int` | Ordre d'affichage. |
| `status` | `status` | `varchar` | `'active' \| 'archived'`. |
| `targetAmount` | `target_amount` | `double \| null` | Objectif : montant cible (€). `null` = pas d'objectif. |
| `targetDate` | `target_date` | `date \| null` | Échéance de l'objectif (`YYYY-MM-DD`), optionnelle. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |
| `archivedAt` | `archived_at` | `timestamptz \| null` | Renseigné à l'archivage. |

> La **nature** (`actif`/`passif`) n'est **pas stockée** : dérivée du type via
> `natureOf()` (`types.ts`) — seule la dette est un passif. Le **solde courant**
> n'est pas stocké non plus : c'est l'`amount` du dernier relevé.

### `SnapshotEntity` → table `snapshots`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `envelopeId` | `envelope_id` | `uuid` (FK, indexée) | `ON DELETE CASCADE`. |
| `date` | `date` | `date` | `YYYY-MM-DD` (date locale). |
| `amount` | `amount` | `double precision` | Valeur / solde **≥ 0** (la nature porte le signe). |
| `gain` | `gain` | `double \| null` | Plus-value latente **comprise dans `amount`** (investissement). |
| `note` | `note` | `text \| null` | Commentaire optionnel. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

### `FinancesSettingsEntity` → table `finances_settings`
Singleton (id fixe `'me'`, même pattern que `HealthProfileEntity`). Porte l'**objectif
de patrimoine net global** :
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `varchar` (PK) | Constant `'me'`. |
| `netWorthTarget` | `net_worth_target` | `double \| null` | Montant cible net (€), optionnel. |
| `netWorthTargetDate` | `net_worth_target_date` | `date \| null` | Échéance, optionnelle. |
| `updatedAt` | `updated_at` | `timestamptz` | Auto. |

**Règles structurelles :**
- **Contrainte d'unicité** `uq_envelope_date` sur `(envelope_id, date)` : un seul
  relevé par jour → re-saisir une date **écrase** (upsert).
- À la création d'une enveloppe, un **premier relevé** matérialise le solde initial.
- Supprimer une enveloppe supprime ses relevés **en cascade** (FK Postgres).

---

## 3. Persistance (PostgreSQL via TypeORM)

Repositories TypeORM (`EnvelopeEntity`, `SnapshotEntity`) injectés dans
`FinancesService` ; connexion dans `app.module.ts` ; `synchronize: true` ; données
dans le volume `db_data`.

```bash
docker exec progression-db psql -U progression -d progression -c "SELECT * FROM snapshots ORDER BY date;"
```

---

## 4. API REST

Base URL `http://localhost:3000`. Contrôleur
`backend/src/finances/finances.controller.ts`. Préfixe `/finances`.

| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/finances/overview` | `?months=&today=&projection=` | Net, variation, répartition par type (`repartition`) et par enveloppe (`repartitionByEnvelope`), plus-values, courbe (`evolution`), composition (`evolutionByType`), `kpis`, **projection** (`monthlySavings`, `projection[]`, `projectionMonths`), `netObjective`, enveloppes décorées. |
| `GET` | `/finances/settings` | — | Réglages globaux (objectif net). Crée le singleton si absent. |
| `PUT` | `/finances/settings` | `{ netWorthTarget?, netWorthTargetDate? }` | Met à jour l'objectif net (`null` = effacer). |
| `POST` | `/finances/snapshots/bulk` | `{ date, items:[{ envelopeId, amount, gain? }] }` | **Bilan** : upsert groupé à une même date (items sans montant ignorés). |
| `GET` | `/finances/envelopes` | `?includeArchived=` | Liste des enveloppes décorées (solde + stats). |
| `POST` | `/finances/envelopes` | `EnvelopeInput` | Crée (+ premier relevé). Accepte `targetAmount?`, `targetDate?`. |
| `PUT` | `/finances/envelopes/reorder` | `{ ids }` | Réordonne. **Avant** les routes `:id`. |
| `GET` | `/finances/envelopes/:id` | — | Détail + `history`, `objective`, stats (`firstSnapshotDate`, `totalChange`). |
| `PATCH` | `/finances/envelopes/:id` | `{ name?, color?, icon?, targetAmount?, targetDate? }` | Édite (pas le type). `targetAmount: null` efface l'objectif. |
| `POST` | `/finances/envelopes/:id/archive` · `/unarchive` | — | Archive / désarchive. |
| `DELETE` | `/finances/envelopes/:id` | — | Supprime (cascade relevés). |
| `PUT` | `/finances/envelopes/:id/snapshots/:date` | `{ amount, gain?, note? }` | **Upsert** d'un relevé à une date. |
| `DELETE` | `/finances/snapshots/:id` | — | Supprime un relevé. |

### Validation (`400`)
- `name` non vide ≤ 60, non dupliqué parmi les actives ; `type` parmi les 5.
- `amount` : nombre **≥ 0**. `gain` : nombre (signe libre), ignoré hors investissement.
- `date` : `YYYY-MM-DD` strict.
- `targetAmount` : nombre **≥ 0** ou `null`/vide (efface). `targetDate` : `YYYY-MM-DD`
  ou `null`/vide. Helpers `validateTargetAmount` / `validateTargetDate`.

---

## 5. Calculs (le cœur métier)

Fichier `backend/src/finances/finances.service.ts`. Tous les montants sont
**arrondis à 2 décimales** (`round2`, importé du helper partagé
`backend/src/common/round.util.ts`).

### 5.1 Décoration d'une enveloppe (`decorate`)
À partir des relevés triés du plus récent au plus ancien : `balance` = `amount` du
dernier ; `lastVariation` = écart au précédent ; pour l'investissement : `gain`,
`investedCapital = amount − gain`, `performancePct = gain / investedCapital`.

**Tendance 30 j** (`trend30`) : `{ amount, pct }` = solde courant − solde au dernier
relevé daté `≤ today − 30 j` (report du dernier solde connu). `null` si pas assez
d'historique. Utilisé par le tableau de bord pour afficher une tendance
haussière/baissière par enveloppe.

**Fraîcheur** (`#2`) : `daysSinceUpdate = daysBetween(lastSnapshotDate, today)` et
`stale = daysSinceUpdate > STALE_AFTER_DAYS` (31). `null` si aucun relevé.

**Objectif** (`objective`, calculé ici — source unique partagée par `listEnvelopes`,
`getEnvelope` et `overview`) : si `targetAmount > 0`, expose `targetAmount`,
`targetDate`, `progressPct = balance / targetAmount × 100`,
`remaining = max(targetAmount − balance, 0)`, `reached`, plus la **projection** (`#6`,
`projectTarget`) : `eta` (date estimée d'atteinte), `paceStatus`
(`on_track`/`behind`/`reached`/`no_pace`) et `requiredMonthly` (apport mensuel requis si
« en retard »). La pente vient de `slopePerDay` (régression linéaire des relevés).

**Stats détail** (`getEnvelope` uniquement) : `firstSnapshotDate` (premier relevé) et
`totalChange = balance − montant du premier relevé`.

### 5.2 Patrimoine (overview)
- **Brut** = Σ soldes des **actifs** ; **passifs** = Σ soldes des passifs ;
  **net** = brut − passifs (enveloppes **actives** uniquement).
- **Plus-value totale** = Σ `gain` des derniers relevés d'investissement.
- **Répartition** = part de chaque **type actif** dans le brut (types à 0 filtrés).

### 5.3 Net à une date & courbe d'évolution
- `netAt(date)` : pour chaque enveloppe, on prend son **dernier relevé de date ≤ date**
  (report du dernier solde connu, `lastSnapshotUpTo`), signe selon la nature.
- **Courbe** : un point par mois sur `months`, à la **fin de mois** sauf le mois
  courant (date du jour `today`).
- **Variation** : `net(today) − net(fin du mois précédent)`, en € et % (% masqué si
  référence = 0).

`months` est borné à **[1, 60]** (`clampMonths`).

### 5.4 Composition, KPIs, objectif net (overview)
- **`evolutionByType`** (#7) : pour chaque date de `evolution`, le solde par **type
  actif** (report du dernier solde connu, ventilé par type).
- **`kpis`** (#8) : `ytd` (`net − net(31/12 n-1)`), `oneYear` (`net − net(today−365j)`),
  `allTimeHigh` (max de la série mensuelle depuis le 1ᵉʳ relevé jusqu'à `ref`, + sa date).
- **`netObjective`** (#10) : depuis les réglages (`netWorthTarget`/`Date`), même forme
  que l'objectif d'enveloppe (progress, remaining, reached + projection `projectTarget`
  sur la pente de `evolution`). `null` si pas d'objectif.
- **Projection de patrimoine** (`?projection=` mois, borné [0, 120] par `clampProjection`) :
  `monthlySavings` = **épargne moyenne mensuelle** = pente (`slopePerDay`) de la série
  mensuelle du net sur **≤ 12 mois** d'historique × `365/12` (`null` si < 2 points).
  `projection[]` = `{ date, net }` pour chaque mois futur (`net = netWorth +
  monthlySavings × i`), vide si horizon 0 ou épargne inconnue. Tracée en **pointillé**
  par `NetWorthChart` (prop `projection`), connectée au dernier point réel.

### 5.5 Bilan groupé & réglages
- **`bulkSetSnapshots`** (#1) : valide la date puis applique `setSnapshot` (upsert) à
  chaque item ; items sans montant ignorés ; renvoie la liste re-décorée.
- **`getSettings`/`updateSettings`** : singleton (création paresseuse), valident via
  `validateTargetAmount`/`validateTargetDate`.
- Helpers de projection : `slopePerDay` (régression linéaire €/jour sur une fenêtre) et
  `projectTarget` (eta + `paceStatus` + `requiredMonthly`) ; `daysBetween` dans `date.util.ts`.

---

## 6. Frontend — structure

Le module est découpé en **trois routes** (sous-menu *Finances* dans `Layout.jsx`) :
`/finances` (vue d'ensemble), `/finances/enveloppes` (gestion) et `/finances/bilan`
(saisie groupée).

```
api/finances.js                         # endpoints (overview, envelopes, settings, snapshots/bulk…)
api/client.js                           # helper `request()` fetch partagé
pages/FinancesPage.jsx                  # /finances : suivi global, KPIs, objectif net, composition
pages/EnvelopesPage.jsx / .css          # /finances/enveloppes : cartes, drag-drop, archivées, drawer
pages/BilanPage.jsx / .css              # /finances/bilan : saisie groupée (#1)
pages/FinancesPage.css                  # styles communs (page, hero, KPIs, chart, donut, modale, drawer)
components/finances/
  constants.js                          # TYPE_META, formatage, objectivePace, formatDaysAgo
  NetWorthChart.jsx                     # courbe d'évolution du net (SVG)
  StackedAreaChart.jsx                  # composition par type, aires empilées (SVG, #7)
  Donut.jsx                             # répartition (SVG)
  EnvelopeCard.jsx                      # carte (solde, fraîcheur, objectif + rythme, « + Solde »)
  EnvelopeFormModal.jsx                 # créer / éditer + objectif
  EnvelopeDrawer.jsx                    # détail + stats + objectif + maj solde + réactiver
  NetObjectiveModal.jsx                 # réglage de l'objectif net global (#10)
```

- `FinancesPage` charge `GET /finances/overview` : suivi global + **KPIs temporels** +
  **objectif net** (barre + `NetObjectiveModal` → `PUT /finances/settings`) + courbe
  avec bascule **Net/Composition** (`StackedAreaChart`) + **projection** (sélecteur
  d'horizon → param `projection`, `NetWorthChart` trace une portion **pointillée** +
  caption d'épargne moyenne) + **donut de répartition** avec bascule **Type/Enveloppe**
  (`repartition` / `repartitionByEnvelope`), **cliquable → `/finances/enveloppes`** (accès
  principal à la gestion) + **bandeau de rappel** de fraîcheur. Aucune gestion ici. Le
  `Donut` est générique (`slices=[{key,label,color,total,pct}]`).
- `EnvelopesPage` charge `GET /finances/envelopes?includeArchived=true`, sépare actives /
  archivées, rend une grille d'`EnvelopeCard` **réordonnable par glisser-déposer**
  (`reorder`, mirroir `HabitsPage`), une section **Archivées** (`unarchive`), et le drawer.
- `BilanPage` charge les enveloppes, pré-remplit les soldes et poste
  `POST /finances/snapshots/bulk` en une passe.
- L'objectif est affiché en **barre de progression** (`.fprog*`) + phrase de rythme
  (`objectivePace`), réutilisées par carte, drawer, résumé compact et objectif net.
  Helper de date `frenchMonthYear` (`utils/date.js`).
- Les graphiques sont des **SVG faits main** (pas de librairie). Rappel projet :
  les couleurs de tracé/barres sont passées en **hex concret**, pas en `var()` CSS.

---

## 7. Spécification fonctionnelle de référence

[`specs/module_finances.md`](../../specs/module_finances.md) fait foi pour les
règles métier (`RG-xx`) ; ce document décrit l'état **réel** du code.

---

## 8. Pour aller plus loin (non implémenté)

Ne sont **pas** dans le code : module Dépenses / budget (transactions), Dashboard
agrégé, agrégation bancaire automatique, distinction **apports / valorisation** (taux
d'épargne), multi-devises et export. Sont en revanche implémentés : objectifs
d'enveloppe et **objectif net global** avec projection (§5.1/§5.4), bilan groupé,
fraîcheur, archivage UI et réordonnancement. Voir le backlog de la spec.
