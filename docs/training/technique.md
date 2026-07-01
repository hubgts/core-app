# Module Entraînement — Documentation technique

> Comment le module fonctionne **côté code**. Pensé pour être compris par un·e
> développeur·euse, même junior. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Vue d'ensemble

Trois services Docker Compose (détail commun : cf. doc Habitudes) :

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | React 18 + Vite | `5173` | Calendrier (Semaine / Mois), détail off-canvas. |
| **backend** | NestJS (Node 18, TS) | `3000` | API REST + agrégats (tonnage, PR, zones). |
| **db** | PostgreSQL 16 | `5432` (interne) | Persistance séances / exercices / séries. |

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

Trois entités, dans `backend/src/training/entities/`. Une séance possède des
exercices (musculation), qui possèdent des séries — en **tables séparées** liées par
FK `ON DELETE CASCADE`.

### `TrainingEventEntity` → table `training_events`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `date` | `date` | `date` (indexée) | `YYYY-MM-DD` (date locale). |
| `type` | `type` | `varchar` | `musculation \| cardio \| autre`. |
| `startTime` | `start_time` | `varchar(5) \| null` | `HH:MM` ou `null` = évènement « journée ». |
| `durationMin` | `duration_min` | `int \| null` | Durée en minutes. |
| `feeling` | `feeling` | `int \| null` | Ressenti 1–5. |
| `zone` | `zone` | `varchar(2) \| null` | (Cardio) `Z1`–`Z5`. |
| `title` | `title` | `varchar(60) \| null` | (Autre) Titre. |
| `description` | `description` | `text \| null` | (Cardio / Autre). |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` | `timestamptz` | Auto (`@CreateDateColumn` / `@UpdateDateColumn`). |

### `ExerciseEntity` → table `exercises`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `eventId` | `event_id` | `uuid` (FK, indexée) | → `training_events`, `ON DELETE CASCADE`. |
| `name` | `name` | `varchar(60)` | Nom affiché. |
| `nameKey` | `name_key` | `varchar(60)` (indexée) | Nom normalisé (sans accents, minuscule) → **consolidation des stats** et autocomplétion. |
| `position` | `position` | `int` | Ordre dans la séance. |

### `ExerciseSetEntity` → table `exercise_sets`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `exerciseId` | `exercise_id` | `uuid` (FK, indexée) | → `exercises`, `ON DELETE CASCADE`. |
| `reps` | `reps` | `int` | Répétitions. |
| `weight` | `weight` | `double precision` | Charge en kg (`0` = poids du corps). |
| `position` | `position` | `int` | Ordre de la série. |

> À l'édition d'une séance de musculation, les exercices/séries sont **réécrits**
> (supprimés puis recréés) à partir du payload — d'où des `id` non stables entre
> deux enregistrements.

### Programmes / cycles (4 entités)

Modèle réutilisable de **phases → semaines → séances**, démarré à une date pour
**copier** des séances dans le planning. Entités dans `entities/` :

- **`TrainingProgramEntity` → `training_programs`** : `name`, `name_key`
  (normalisé), `description`.
- **`TrainingProgramPhaseEntity` → `training_program_phases`** : `program_id`
  (FK CASCADE), `name`, `objective` (null), `position`.
- **`TrainingProgramWeekEntity` → `training_program_weeks`** : `program_id`
  (FK CASCADE), `phase_id` (FK SET NULL, null = hors phase), `index` (1-based →
  `S{index}`), `objective` (null), `is_deload` (bool), `position`.
- **`TrainingProgramSessionEntity` → `training_program_sessions`** : `week_id`
  (FK CASCADE), `day_of_week` (1 = lundi … 7 = dimanche), `position`, payload de
  séance calqué sur le template (`type`, `label`, `start_time`, `duration_min`,
  `feeling`, `zone`, `title`, `description`, `exercises` jsonb) + `source_template_id`.

**Snapshot sur `training_events`** : deux colonnes nullable `program_label` et
`program_objective`, figées au démarrage (aucun lien vivant ensuite).

> Comme pour les exercices d'une séance, l'édition d'un programme **réécrit**
> entièrement ses enfants (phases/semaines/séances supprimés puis recréés).

---

## 3. Persistance (PostgreSQL via TypeORM)

Repositories TypeORM (`TrainingEventEntity`, `ExerciseEntity`, `ExerciseSetEntity`)
injectés dans `TrainingService` ; connexion dans `app.module.ts` ;
`synchronize: true` ; données dans le volume `db_data`.

```bash
docker exec progression-db psql -U progression -d progression -c "SELECT date, type FROM training_events ORDER BY date;"
```

---

## 4. API REST

Base URL `http://localhost:3000`. Contrôleur
`backend/src/training/training.controller.ts`. Préfixe `/training`.

| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/training/events` | `?from=&to=` | Séances d'une plage (calendrier), avec exercices + séries. |
| `GET` | `/training/exercises/names` | `?q=` | Autocomplétion des noms d'exercices déjà saisis (top 10). |
| `GET` | `/training/stats` | `?from=&to=` | Agrégats sur la période (voir §5). **Consommé par le Dashboard** ; la vue Stats du module a été retirée (à refaire plus tard). |
| `GET` | `/training/events/:id` | — | Détail d'une séance. |
| `POST` | `/training/events` | `EventInput` | Crée. Renvoie `{ event, prs }`. |
| `PATCH` | `/training/events/:id` | `EventInput` | Modifie. Renvoie `{ event, prs }`. |
| `DELETE` | `/training/events/:id` | — | Supprime (cascade exercices/séries). |

### Programmes (préfixe `/training/programs`)
| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/training/programs` | `?q=` | Liste (résumé : compteurs phases/semaines/séances). |
| `GET` | `/training/programs/:id` | — | Détail complet (phases, semaines, séances). |
| `POST` | `/training/programs` | `ProgramInput` | Crée. |
| `PATCH` | `/training/programs/:id` | `ProgramInput` | Modifie (réécrit les enfants). |
| `DELETE` | `/training/programs/:id` | — | Supprime (cascade). |
| `GET` | `/training/programs/:id/preview` | `?startDate=` | Aperçu du placement (dates + séances ignorées). |
| `POST` | `/training/programs/:id/start` | `{ startDate }` | Démarre : crée les `training_events` (snapshot programme). |

> `ProgramInput` : `{ name, description?, phases: [{ name, objective? }],
> weeks: [{ index?, phaseIndex?, objective?, isDeload?, sessions: ProgramSessionInput[] }] }`.
> Une semaine référence sa phase par **`phaseIndex`** (position dans `phases`).

### `EventInput`
```ts
{
  date?, type?, startTime?, durationMin?, feeling?,    // socle commun
  exercises?: { name, sets: { reps, weight }[] }[],    // musculation
  zone?,                                               // cardio
  description?,                                        // cardio / autre
  title?,                                              // autre
}
```

### Validation (`400`)
- `date` / `from` / `to` : `YYYY-MM-DD` strict ; `startTime` : `HH:MM` si présent.
- `type` parmi les 3 ; `zone` parmi `Z1`–`Z5` ; champs hors-type ignorés.

---

## 5. Calculs (le cœur métier)

Fichier `backend/src/training/training.service.ts`.

### 5.1 Tonnage (`toResponse`)
Pour chaque séance de musculation : `tonnage = Σ (reps × weight)` sur toutes les
séries de tous les exercices.

### 5.2 Records (PR) — `computePrs`
À la création/édition d'une séance de musculation, pour chaque exercice (clé =
`nameKey`), on compare la **charge max du payload** à la **charge max historique**
de cet exercice. Si elle la dépasse, l'exercice est renvoyé dans `prs`
(`{ exerciseName, weight }`) → le frontend félicite l'utilisateur.

### 5.3 Statistiques (`stats`) sur une plage `from`/`to`
> La **vue Stats du module Entraînement a été retirée** (à refaire plus tard).
> L'agrégat reste exposé car il est **consommé par le Dashboard** (résumé jour/semaine).
- **Overview** : `sessions` (nb), `durationMin` (somme), `avgFeeling` (moyenne
  arrondie 0,1), `byType` (compte par type).
- **Musculation** : `tonnage` total, `tonnageByDate` (trié), `maxByExercise`
  (charge max par exercice, triée décroissant).
- **Cardio** : `sessions`, `durationMin`, `timeByZone` (minutes par zone Z1–Z5).

### 5.3bis Démarrage d'un programme (`TrainingProgramService`)
Fichier `backend/src/training/training-program.service.ts`.
- **Ancrage des jours** : `J1 = lundi … J7 = dimanche`. Pour la **n-ième semaine**
  (ordre des semaines, 1-based), le lundi de référence = `mondayOf(startDate) +
  (n−1)×7` ; la date d'une séance de jour `Jd` = `lundiRéf + (Jd−1)` (helpers
  `mondayOf` / `addDays` de `common/date.util.ts`, calcul en UTC).
- **Semaine partielle** : en **1re semaine uniquement**, une séance dont la date <
  `startDate` est **ignorée** (jamais placée).
- **Objectif résolu** : `semaine.objective ?? phase.objective ?? null`, figé dans
  `program_objective` ; `program_label = programme.name`.
- La création réutilise `TrainingService.createForProgram` (resolve +
  persistExercises, **sans détection de PR**).

### 5.4 Normalisation des noms (`normalizeKey`)
Sans accents, minuscule, espaces normalisés. Sert à **consolider** un même exercice
saisi avec des casses/accents différents (stats et autocomplétion).

---

## 6. Frontend — structure

```
api/training.js                         # endpoints entraînement (s'appuie sur api/client.js)
api/client.js                           # helper `request()` fetch partagé
utils/format.js                         # helpers de formatage partagés (formatDuration)
pages/TrainingPage.jsx / .css           # calendrier + sélecteur de vue + orchestration
components/training/
  constants.js                          # TYPE_META, zones cardio, tonnageOf, libellés
  WeekView.jsx                          # vue Semaine (grille horaire 6h–23h)
  MonthView.jsx                         # vue Mois (pastilles par type)
  EventDrawer.jsx                       # détail off-canvas (formatDuration via utils/format)
  EventFormModal.jsx                    # créer / éditer une séance (formulaire par type)
  ExerciseCombobox.jsx                  # saisie d'exercice avec autocomplétion
```

- **Vues réellement câblées** : `week` et `month` (état `view`). *(Un `YearView.jsx`
  existe dans le dossier mais n'est pas monté par la page ; la vue Stats a été
  retirée, à refaire plus tard.)*
- `TrainingPage` charge `GET /training/events?from=&to=` selon la période affichée.
  Création/édition via la modale, détail via le drawer ; un clic sur un jour/créneau
  pré-remplit la date/heure.
- L'autocomplétion d'exercices appelle `GET /training/exercises/names?q=`.

### Sous-page Programmes

Entrée de sous-menu `/entrainement/programmes` → `pages/ProgramsPage.jsx` (liste +
orchestration). Composants `components/training/` :
- `ProgramEditor.jsx` — édition complète (nom, phases, semaines `S1…Sn`, séances
  par jour `J1…J7`) en état local, enregistrée d'un bloc.
- `ProgramSessionModal.jsx` — édite une séance de programme (sans date : choix du
  jour ; import depuis un template ; réutilise `ExerciseCombobox`).
- `StartProgramModal.jsx` — date de début + aperçu (`previewProgram`) + démarrage.

L'**indicateur programme** dans le planning (badge `▣` + objectif au survol /
bandeau du `EventDrawer`) s'appuie sur les champs `programLabel` /
`programObjective` désormais exposés par `GET /training/events`.

### Sous-page Mensuration

Le suivi poids & mensurations est intégré au module Entraînement comme sous-page
**Mensuration** (entrée du sous-menu Entraînement, route `/entrainement/mensuration`).
Côté code, c'est `pages/HealthPage.jsx` (composants `components/health/`, API
`api/health.js`) qui reste **adossé au backend `health`** (préfixe `/health`,
entités `body_measurements`, etc. — inchangé). L'ancienne route `/sante` redirige
vers `/entrainement/mensuration`.

---

## 7. Spécification fonctionnelle de référence

[`specs/module_entrainement.md`](../../specs/module_entrainement.md) fait foi pour
les règles métier ; ce document décrit l'état **réel** du code (qui peut être en
retrait de la spec — ex. seules les vues Semaine/Mois sont câblées).

---

## 8. Pour aller plus loin (non implémenté / partiel)

Ne sont **pas** (ou pas entièrement) câblés : vues **Jour** et **Année** du
calendrier, Padel et autres types d'activité, modèles de séances, imports
(Strava / Health), 1RM estimé / RPE / supersets, Dashboard agrégé. Voir le backlog
de la spec.
