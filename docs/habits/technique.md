# Module Habitudes — Documentation technique

> Comment le module fonctionne **côté code**. Pensé pour être compris par un·e
> développeur·euse, même junior. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Vue d'ensemble

L'application est découpée en trois services lancés via Docker Compose :

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) | `5173` | Interface (grille, heatmap, graphique). |
| **backend** | [NestJS](https://nestjs.com/) (Node 18, TypeScript) | `3000` | API REST + calculs (streaks, complétion). |
| **db** | [PostgreSQL 16](https://www.postgresql.org/) | `5432` (interne) | Persistance des habitudes et des coches. |

```
Navigateur ──HTTP──▶ Frontend (React/Vite :5173)
                        │  fetch JSON
                        ▼
                     Backend (NestJS :3000)
                        │  TypeORM
                        ▼
                     PostgreSQL (volume Docker db_data)
```

L'accès à la base passe par [TypeORM](https://typeorm.io/) (repositories injectés
dans `HabitsService`). Le port Postgres n'est pas exposé sur l'hôte : seul le
backend y accède, via le réseau Docker (`DB_HOST=db`).

Le frontend ne contient **aucune logique de calcul de streak** : il affiche ce
que le backend renvoie. Les seuls calculs côté frontend sont **d'affichage**
(taux de complétion du mois/année dérivés des coches déjà chargées).

### Démarrage

```bash
make init       # build des images + démarrage (équivaut à dc-build puis dc-up)
make dc-logs    # logs en direct
make dc-down    # arrêt
make dc-restart # redémarre SANS rebuild
```

> Important : le `Dockerfile` du frontend fait `COPY . .` puis `npm run dev`. Le
> code source est **figé dans l'image au build**. Après une modification du code,
> il faut **reconstruire** l'image (`make dc-build` ou
> `docker compose -f docker/docker-compose.yml up -d --build frontend`) ; un
> simple `make dc-restart` ne suffit pas.

Au démarrage, le backend attend que Postgres soit **healthy** (`depends_on:
condition: service_healthy`), puis **TypeORM crée/maintient les tables
automatiquement** (`synchronize: true`) — aucune commande de migration à lancer.

### Variables d'environnement (backend)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port d'écoute de l'API. |
| `DB_HOST` | `localhost` | Hôte Postgres (`db` en Docker). |
| `DB_PORT` | `5432` | Port Postgres. |
| `DB_USER` | `progression` | Utilisateur. |
| `DB_PASSWORD` | `progression` | Mot de passe. |
| `DB_NAME` | `progression` | Base de données. |

Ces valeurs sont définies dans `docker/docker-compose.yml` (services `db` et
`backend`). Les identifiants par défaut conviennent au développement local ;
à durcir pour un déploiement réel.

---

## 2. Modèle de données

Deux entités TypeORM, dans `backend/src/habits/entities/`. La colonne SQL est
indiquée quand elle diffère du nom de propriété (convention `snake_case` en base).

### `HabitEntity` → table `habits`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(40)` | 1 à 40 car. Unique parmi les actives (insensible à la casse, vérifié applicativement). |
| `weeklyTarget` | `weekly_target` | `int` (défaut 7) | Objectif hebdo, **1 à 7**. `7` = quotidienne. |
| `color` | `color` | `varchar` | Couleur d'accent (hex). Défaut assigné si absent. |
| `icon` | `icon` | `varchar` | Emoji (max 8 caractères). |
| `position` | `position` | `int` | Ordre d'affichage (drag & drop). |
| `status` | `status` | `varchar` | `'active' \| 'archived'`, défaut `active`. |
| `createdAt` | `created_at` | `timestamptz` | Auto. **Repère visuel** et **borne de calcul**. |
| `archivedAt` | `archived_at` | `timestamptz \| null` | Renseigné à l'archivage. |

### `HabitCheckEntity` → table `habit_checks`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `habitId` | `habit_id` | `uuid` (FK, indexée) | Référence `habits.id`, **`ON DELETE CASCADE`**. |
| `date` | `date` | `date` | Jour coché, `YYYY-MM-DD` (date locale, sans heure). |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

**Règles structurelles :**
- **Une coche = une ligne** `habit_checks`. Cocher crée la ligne, décocher la
  supprime. L'absence de ligne = « non coché ».
- **Contrainte d'unicité** `uq_habit_date` sur `(habit_id, date)` : impossible
  d'avoir deux coches pour le même jour.
- Pas d'état « raté » stocké : l'absence vaut « non fait ».
- Supprimer une habitude supprime **en cascade** toutes ses coches (FK Postgres).
- La relation `HabitCheckEntity.habit` (`@ManyToOne`) porte la cascade ; la
  propriété `habitId` expose la colonne FK directement (pratique pour insérer une
  coche sans charger l'habitude).

---

## 3. Persistance (PostgreSQL via TypeORM)

- Toute la persistance passe par **PostgreSQL 16** (service `db`), accédé via les
  **repositories TypeORM** injectés dans `HabitsService`
  (`@InjectRepository(HabitEntity)` / `HabitCheckEntity`).
- Configuration de la connexion : `TypeOrmModule.forRoot(...)` dans
  `backend/src/app.module.ts`, alimentée par les variables d'environnement
  (voir §1). Les entités y sont déclarées explicitement.
- **Schéma** : `synchronize: true` → TypeORM crée et met à jour les tables au
  démarrage à partir des entités. Simple pour le MVP ; **à remplacer par des
  migrations** dès qu'il y a des données de production à préserver (sinon une
  modification d'entité peut altérer le schéma sans contrôle).
- **Durabilité** : les données vivent dans le volume Docker nommé `db_data`
  (monté sur `/var/lib/postgresql/data`). Elles survivent aux
  `make dc-down` / `dc-restart` / rebuilds, et ne sont effacées que par
  `make dc-clean` (`down -v`).

### Inspecter / sauvegarder la base

```bash
# Ouvrir un shell SQL
docker exec -it progression-db psql -U progression -d progression

# Lister les tables, voir les coches
docker exec progression-db psql -U progression -d progression -c "\dt"
docker exec progression-db psql -U progression -d progression -c "SELECT * FROM habit_checks;"

# Dump / restauration
docker exec progression-db pg_dump -U progression progression > backup.sql
cat backup.sql | docker exec -i progression-db psql -U progression -d progression
```

---

## 4. API REST

Base URL : `http://localhost:3000` (configurable côté front via `VITE_API_URL`).
Contrôleur : `backend/src/habits/habits.controller.ts`. Toutes les routes sont
préfixées par `/habits`.

| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/habits` | `?today=YYYY-MM-DD` | Liste les habitudes **actives** + leurs `stats`. `today` = date locale du client. |
| `GET` | `/habits/checks` | `?from=&to=` | Coches sur une plage de dates (pour peindre la grille / heatmap / graphique). |
| `POST` | `/habits` | `{ name, weeklyTarget?, color?, icon? }` | Crée une habitude. |
| `PUT` | `/habits/reorder` | `{ ids: string[] }` | Réordonne (positions = ordre du tableau). |
| `PATCH` | `/habits/:id` | `{ name?, weeklyTarget?, color?, icon? }` | Modifie une habitude. |
| `POST` | `/habits/:id/archive` | — | Archive (réversible). |
| `POST` | `/habits/:id/unarchive` | — | Désarchive. *(Endpoint présent ; pas encore utilisé par l'UI.)* |
| `DELETE` | `/habits/:id` | — | Supprime l'habitude + ses coches. |
| `PUT` | `/habits/:id/checks/:date` | `{ checked: boolean }`, `?today=` | Coche/décoche un jour. Renvoie `{ stats, milestones }`. |

> ⚠️ L'ordre des routes compte : `PUT /habits/reorder` est déclaré **avant**
> `PATCH /habits/:id` pour ne pas être capturé par la route paramétrée.

### Forme de `stats` (renvoyée pour chaque habitude)
```ts
{
  currentStreak: number,   // série en cours
  bestStreak: number,      // record
  totalChecks: number,     // nb total de coches
  streakUnit: 'days' | 'weeks',
  weekDone: number,        // coches de la semaine courante (lun→dim)
}
```

### Validation (renvoie `400 Bad Request`)
- `name` : non vide, ≤ 40 caractères, non dupliqué parmi les actives.
- `weeklyTarget` : entier **1 à 7** (sinon erreur). Absent → défaut `7`.
- `date` / `from` / `to` : format `YYYY-MM-DD` strict (les dates impossibles type
  `2026-02-30` sont rejetées).

---

## 5. Calculs (le cœur métier)

Fichier : `backend/src/habits/habits.service.ts`. Dates manipulées en **UTC minuit**
(`date.util.ts`) pour éviter les décalages de fuseau / changement d'heure.

### 5.1 Avancement de la semaine — `weekDone`
Commun à toutes les habitudes. On compte les coches de la **semaine ISO courante**
(lundi → dimanche, lundi obtenu via `mondayOf(today)`). Calculé **par rapport à
aujourd'hui**, donc indépendant du mois affiché.

### 5.2 Streak — adaptatif selon l'objectif

**Habitude quotidienne (`weeklyTarget === 7`)** → `dailyStats` :
- `currentStreak` = nombre de **jours consécutifs** cochés en remontant depuis
  aujourd'hui.
- **Tolérance** : si aujourd'hui n'est pas (encore) coché, on part de **hier**,
  pour ne pas casser la série tant que la journée n'est pas finie.
- `bestStreak` = plus longue suite de jours consécutifs jamais réalisée.

**Habitude à objectif hebdo (`weeklyTarget < 7`)** → `weeklyStats` :
- On regroupe les coches par **semaine ISO** (clé = lundi).
- Une semaine « compte » si `nb de coches ≥ weeklyTarget`.
- `currentStreak` = nombre de **semaines consécutives** ayant atteint l'objectif.
- **Tolérance** : la semaine en cours ne casse jamais la série tant qu'elle n'est
  pas finie ; elle ne la **prolonge** que si l'objectif y est **déjà** atteint.
- `bestStreak` = plus longue suite de semaines consécutives ayant atteint l'objectif.

`streakUnit` vaut `'days'` ou `'weeks'` selon le mode, pour que le frontend
affiche la bonne unité (`🔥 12` vs `🔥 3 sem`).

### 5.3 Paliers — `milestonesForStreak(streak, unit)`
Renvoie les paliers franchis par la série en cours :
- unité `days` : `[7, 30, 100, 365]`
- unité `weeks` : `[4, 12, 26, 52]`

Au franchissement, le frontend affiche un toast de félicitations (aucun score
n'est encore persisté).

### 5.4 Taux de complétion (calculé **côté frontend**)
Les pourcentages sont dérivés des coches déjà chargées, en **tenant compte de la
date de création** (les jours antérieurs sont exclus du numérateur **et** du
dénominateur).

Pour une habitude sur une période :
```
joursEligibles = jours de la période où date >= createdAt
attendu        = weeklyTarget * (joursEligibles / 7)
fait           = nb de coches sur la période (date >= createdAt)
complétion %   = min(fait, attendu) / attendu        // plafonné à 100 %
```
- **KPI « Complétion du mois »** (pied de grille) : moyenne pondérée sur toutes les
  habitudes actives → `Σ min(fait, attendu) / Σ attendu`
  (`HabitsPage.jsx`, mémo `kpis`).
- **% annuel** par habitude dans la heatmap : même formule sur l'année,
  pré-calculée une seule fois par rendu dans une `Map` mémoïsée indexée par
  `habitId` (`YearHeatmap.jsx`, `yearPctById`).

### 5.5 Anneaux de progression du rail (« Sem. » et « Mois »)
Dans la grille mensuelle, chaque ligne affiche deux anneaux `fait/objectif`
(composant générique `ProgressRing`), calculés **côté frontend** :
- **Sem.** : `done = stats.weekDone` (renvoyé par le backend, **semaine réelle
  courante**), `target = weeklyTarget`.
- **Mois** : calculé sur le **mois affiché** dans `HabitsPage.jsx`. On parcourt les
  jours du mois en ignorant ceux antérieurs à `createdAt` :
  ```
  monthEligible = jours du mois où date >= createdAt
  monthDone     = coches du mois (date >= createdAt)
  monthTarget   = max(1, round(weeklyTarget * monthEligible / 7))
  ```
  Le `max(1, …)` évite une division par zéro / un objectif nul pour une habitude
  créée en toute fin de mois.

> À noter la nuance de référence temporelle : « Sem. » suit la **semaine réelle**
> (donc indépendante du mois consulté), tandis que « Mois » suit le **mois
> affiché** à l'écran.

> Conséquence : si on coche un jour **avant la création** (autorisé, permissif),
> cette coche n'entre pas dans les pourcentages — cohérent avec l'affichage grisé.

---

## 6. Frontend — structure

Arborescence (`frontend/src/`) :

```
api/habits.js              # endpoints habitudes (s'appuie sur api/client.js)
api/client.js              # helper `request()` fetch partagé par tous les modules
pages/HabitsPage.jsx       # page unique : barre de contrôle + aiguillage des vues
pages/HabitsPage.css
components/
  HabitFormModal.jsx       # modale créer/éditer (nom, objectif, icône, couleur)
  ProgressChart.jsx        # vue Graphique : courbes cumulées + rythme cible (SVG)
  YearHeatmap.jsx          # vue Grille-Année : heatmap façon GitHub
  Layout.jsx               # cadre commun
utils/date.js              # helpers de dates locales (ymd, mondayOf, monthDates…)
config.js                  # API_URL
```

### Aiguillage des vues (`HabitsPage.jsx`)
Deux états indépendants pilotent l'affichage :
- `view` : `'grid' | 'chart'`
- `period` : `'month' | 'year'`

```
view === 'chart'                 → <ProgressChart />
view === 'grid' && period==='year' → <YearHeatmap />
sinon (grid + month)             → table de la grille mensuelle
```

### Chargement des données
Le mémo `range` calcule la plage `{from, to}` à charger selon `period`
(le mois affiché, ou l'année entière). `load()` appelle **en parallèle** :
- `GET /habits?today=` → habitudes + stats,
- `GET /habits/checks?from=&to=` → coches de la plage.

Les coches sont stockées dans un `Set` de clés `"habitId|YYYY-MM-DD"` pour des
tests d'appartenance en O(1).

### Toggle optimiste
Au clic sur une case (`toggle`) : on met à jour le `Set` **immédiatement**, puis
on appelle `PUT /habits/:id/checks/:date`. En cas d'échec réseau, on **annule**
la modification locale et on affiche un toast d'erreur. À la réussite, on
remplace les `stats` de l'habitude par celles renvoyées (streak/weekDone à jour),
et on déclenche un toast si un palier est franchi.

> **Permissivité** : le toggle n'a **aucune restriction de date** (passé, futur,
> avant création — tout est cliquable). Côté backend, `setCheck` ne filtre pas non
> plus les dates futures. Effet de bord assumé : une coche dans le futur peut
> influencer `bestStreak`/`weekDone`. Acceptable pour un outil perso mono-utilisateur.

### Indicateurs visuels des cases (grille mensuelle)
Classes CSS appliquées par case (`cell--*`) :
- `cell--checked` : cochée (fond = couleur de l'habitude).
- `cell--precreate` : jour **avant `createdAt`** → grisé + hachuré, infobulle avec
  la date de création. Reste cliquable.
- `cell--future` : jour `> today` → atténué. Reste cliquable.
- Côté `<td>` : `is-weekend`, `is-today`, `is-weekstart` (trait de séparation au
  lundi). La heatmap a ses équivalents (`hm-cell--on/off/pre/void`).

### Composants de visualisation
- **`ProgressChart`** : SVG « fait main » (pas de librairie de graphes). Pour
  chaque habitude visible, il calcule le **cumul** colonne par colonne
  (`columns` = jours du mois ou 12 mois), trace une **courbe lissée** (lissage à
  tangentes plates → jamais décroissante), plus une **droite de rythme cible**
  (`weeklyTarget * periodDays / 7`). La légende permet de masquer/afficher des
  séries (état `hidden`).
- **`YearHeatmap`** : une ligne par habitude ; chaque mois est une mini-grille de
  7 colonnes (jours de semaine) avec décalage du 1er jour (`isoWeekday`). Clic sur
  un mois → `onPickMonth` qui bascule la page en Grille-Mois sur ce mois.

---

## 7. Spécification fonctionnelle de référence

La spec détaillée (intention, règles de gestion, critères d'acceptation) vit dans
[`specs/module_habitudes.md`](../../specs/module_habitudes.md). En cas de doute
sur une règle métier, c'est la référence ; ce document-ci décrit l'état **réel**
du code.

---

## 8. Pour aller plus loin (non implémenté)

À titre indicatif, ne sont **pas** dans le code actuel : authentification /
multi-utilisateur, **migrations TypeORM** (on utilise `synchronize` pour le MVP),
persistance des paliers et système de points, habitudes quantitatives, rappels,
catégories. Voir le backlog de la spec.
