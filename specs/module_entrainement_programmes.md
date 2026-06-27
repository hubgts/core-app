# Module Entraînement — Programmes / Cycles — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.0 · 2026-06-25
> Extension du module **Entraînement** (cf. [`module_entrainement.md`](./module_entrainement.md)).
> Document autoporteur : il complète le module sans le modifier dans son cœur
> (le calendrier et les templates restent ce qu'ils sont).
> Référence du périmètre global : [`mvp_v1.md`](./mvp_v1.md).
>
> **Périmètre v1.0** : construire un **programme** réutilisable
> (phases → semaines → séances), le **démarrer à une date**, et **placer
> automatiquement les séances dans le planning** avec un indicateur visuel et
> l'objectif du bloc. La périodisation est **descriptive** (on structure et on
> marque les semaines de deload) ; aucune adaptation automatique des charges.

---

## 1. Intention & Philosophie

Le module Entraînement sait aujourd'hui **logger** des séances passées et les
**pré-remplir** depuis des templates, mais il ne sait pas **planifier dans le
temps**. Un pratiquant sérieux raisonne par **cycles** : un programme de plusieurs
semaines, découpé en **phases** (volume, force, affûtage…), avec des **semaines de
décharge (deload)** régulières.

Cette fonctionnalité comble ce manque : on **dessine** un programme une fois, puis
on le **déroule** dans le calendrier en un clic, à la date de notre choix.

Trois principes directeurs :

1. **Construire une fois, dérouler souvent.** Un programme est un **modèle
   réutilisable** : on le bâtit posément (phases, semaines, séances), on le démarre
   autant de fois qu'on veut, à n'importe quelle date.
2. **Le planning reste la source de vérité.** Démarrer un programme ne crée pas une
   couche parallèle : il **copie** de vraies séances dans le calendrier existant.
   Une fois posées, elles vivent leur vie comme n'importe quelle séance.
3. **Structurer sans contraindre.** La périodisation **décrit** une intention
   (objectif de phase, semaine de deload) ; elle ne recalcule jamais les charges à
   ta place. Tu restes maître de chaque séance.

> **Distinction clé avec les templates.** Un **template** est *une* séance modèle,
> sans temporalité. Un **programme** ordonne *plusieurs* séances **dans le temps**
> (semaines, jours de la semaine) et porte une **progression** d'ensemble.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Programme** | Modèle réutilisable et ordonné de **phases → semaines → séances**. Indépendant du calendrier tant qu'il n'est pas démarré. |
| **Phase** (mésocycle) | Groupe de **semaines consécutives** partageant un cap. Porte un **objectif** (ex. « Volume », « Force », « Affûtage »). Optionnelle : une semaine peut exister hors phase. |
| **Semaine (Sn)** | **Microcycle**, indexé `S1 … Sn`. Porte un **objectif optionnel** propre et peut être marquée **deload**. |
| **Séance planifiée** | Une séance attachée à un **jour de semaine** (`J1…J7`) d'une semaine du programme. Définie **en blanc** ou importée **depuis un template** (copie figée du contenu). |
| **Jour `Jd`** | Jour de la semaine, **ancré sur le calendrier** : **J1 = lundi, J2 = mardi, … J7 = dimanche**. |
| **Deload** | Semaine de **décharge** (volume/intensité réduits). Ici, **marqueur visuel** uniquement : aucun calcul automatique. |
| **Objectif résolu** | L'objectif effectivement affiché pour une séance : celui de **sa semaine** si défini, sinon celui de **sa phase**, sinon aucun. |
| **Démarrage** | Action qui **matérialise** le programme dans le planning à partir d'une **date de début** : génère des séances réelles (`training_events`). |
| **Snapshot** | Copie figée (nom du programme + objectif résolu) stockée sur chaque séance placée, pour l'indicateur du planning. Aucun lien vivant ensuite. |

---

## 3. Périmètre (MVP)

**Dans le périmètre**
- CRUD de **programmes** (nom, description) listés dans une **sous-page dédiée** du
  module Entraînement.
- Éditeur de programme : ajouter/réordonner **phases**, **semaines** (`S1…Sn`),
  **séances** (par jour `J1…J7`).
- Objectif réglable au niveau **phase** et/ou **semaine** ; marqueur **deload** par
  semaine.
- Séances de programme créées **en blanc** ou **depuis un template** (copie inline
  du contenu, type Musculation / Cardio / Autre).
- **Démarrer** un programme à une **date de début** → création de séances réelles
  dans le planning, avec **aperçu** préalable (et liste des séances **ignorées** en
  semaine partielle).
- **Indicateur programme** dans le planning (préfixe/badge + objectif au survol /
  dans le détail).

**Hors périmètre (V2 / backlog — cf. §10)**
- Lien vivant programme ↔ séances placées (annulation / replanification groupée).
- Deload à **réduction automatique** de charge/volume.
- **Progression automatique** des charges d'une semaine à l'autre.
- **Templates de programmes** prêts à l'emploi, bibliothèque partagée.
- **Statistiques de cycle** (adhérence au programme, volume planifié vs réalisé).
- Import / export, duplication entre utilisateurs (l'app reste mono-utilisateur).

---

## 4. Modèle de données

Quatre nouvelles entités, dans `backend/src/training/entities/`, conventions
identiques à l'existant (uuid PK, colonnes `snake_case`, `created_at` /
`updated_at` en `timestamptz`, `synchronize: true`). Le payload « séance » d'un
programme **réutilise la forme** de `TrainingTemplateEntity` (mêmes champs
type-spécifiques, `exercises` en `jsonb`).

### 4.1 `training_programs`
| Champ | Type SQL | Règles |
|---|---|---|
| `id` | `uuid` (PK) | Généré. |
| `name` | `varchar(80)` | Nom affiché. Requis. |
| `name_key` | `varchar(80)` (indexé) | Normalisé (sans accents, minuscule) via `normalizeKey` — recherche insensible casse/accents. |
| `description` | `text \| null` | Note libre (intention globale du cycle). |
| `created_at` / `updated_at` | `timestamptz` | Auto. |

### 4.2 `training_program_phases`
| Champ | Type SQL | Règles |
|---|---|---|
| `id` | `uuid` (PK) | Généré. |
| `program_id` | `uuid` (FK, indexé) | → `training_programs`, `ON DELETE CASCADE`. |
| `name` | `varchar(60)` | Ex. « Volume », « Force ». Requis. |
| `objective` | `varchar(120) \| null` | Objectif de la phase (hérité par ses semaines sans objectif propre). |
| `position` | `int` | Ordre des phases dans le programme. |

### 4.3 `training_program_weeks`
| Champ | Type SQL | Règles |
|---|---|---|
| `id` | `uuid` (PK) | Généré. |
| `program_id` | `uuid` (FK, indexé) | → `training_programs`, `ON DELETE CASCADE`. |
| `phase_id` | `uuid \| null` (FK) | → `training_program_phases`, `ON DELETE SET NULL`. `null` = semaine hors phase. |
| `index` | `int` | 1-based → libellé **`S{index}`**. Unique par programme. |
| `objective` | `varchar(120) \| null` | Objectif propre de la semaine (prioritaire sur celui de la phase). |
| `is_deload` | `bool` (défaut `false`) | Marqueur de semaine de décharge (informatif). |
| `position` | `int` | Ordre d'affichage (cohérent avec `index`). |

### 4.4 `training_program_sessions`
Payload de séance calqué sur `TrainingTemplateEntity`, **+** l'ancrage temporel.
| Champ | Type SQL | Règles |
|---|---|---|
| `id` | `uuid` (PK) | Généré. |
| `week_id` | `uuid` (FK, indexé) | → `training_program_weeks`, `ON DELETE CASCADE`. |
| `day_of_week` | `int` | **1–7** (J1 = lundi … J7 = dimanche). |
| `position` | `int` | Ordre si plusieurs séances le même jour. |
| `type` | `varchar` | `musculation \| cardio \| autre`. |
| `label` | `varchar(60) \| null` | Nom court facultatif de la séance (ex. « Push A »). |
| `start_time` | `varchar(5) \| null` | `HH:MM` optionnel ; `null` = séance « journée » (défaut). |
| `duration_min` | `int \| null` | Durée prévue. |
| `feeling` | `int \| null` | Rarement utilisé en planifié ; conservé pour symétrie. |
| `zone` | `varchar(2) \| null` | (Cardio) `Z1`–`Z5`. |
| `title` | `varchar(60) \| null` | (Autre) Titre. |
| `description` | `text \| null` | (Cardio / Autre). |
| `exercises` | `jsonb \| null` | (Musculation) `{ name, sets: { reps, weight }[] }[]` — même format que les templates. |
| `source_template_id` | `uuid \| null` | Traçabilité « importé depuis ce template ». **Non contraignant** : le contenu est figé à l'import (pas de lien vivant). |

### 4.5 Snapshot sur la séance placée (`training_events`)
Démarrer un programme crée des `training_events` standard. Pour porter
l'indicateur du planning **sans lien vivant**, on ajoute **2 colonnes nullable**
(ajout sûr en `synchronize: true`) :
| Champ | Type SQL | Règles |
|---|---|---|
| `program_label` | `varchar(80) \| null` | Nom du programme d'origine, figé. `null` = séance hors programme. |
| `program_objective` | `varchar(120) \| null` | **Objectif résolu** (semaine sinon phase) figé au démarrage. |

> **Réutilisation.** Le contenu d'une séance de programme (`exercises` jsonb,
> champs type-spécifiques) est sérialisé/désérialisé comme un template ; le
> pré-remplissage du formulaire réutilise `applyTemplate()`
> (`EventFormModal.jsx`). La normalisation des noms réutilise `normalizeKey`
> (`training.service.ts`).

---

## 5. Architecture des écrans (UX/UI)

Le module gagne une **entrée de sous-menu** `Programmes` (après *Planning*,
*Templates*, *Mensuration*). Trois surfaces : la **liste**, l'**éditeur**, la
**modale de démarrage** ; plus l'**indicateur** côté planning.

### 5.0 Navigation
```
Entraînement
 ├─ Planning        (calendrier — existant)
 ├─ Templates       (existant)
 ├─ Mensuration     (existant)
 └─ Programmes      ← nouveau   (/entrainement/programmes)
```

### 5.1 Sous-page « Programmes » (liste)
```
┌───────────────────────────────────────────────────────────────┐
│  Programmes                              [ + Programme ]   ⋮    │
│  Construis des cycles, déroule-les dans ton planning.          │
│                                                                │
│  ┌─────────────────────────┐  ┌─────────────────────────┐     │
│  │ 🗓 Prise de masse 8 sem. │  │ 🗓 Force 5x5            │     │
│  │ 2 phases · 8 semaines    │  │ 1 phase · 5 semaines    │     │
│  │ Volume › Affûtage        │  │ Force                   │     │
│  │ [ Démarrer ]        ⋮    │  │ [ Démarrer ]       ⋮    │     │
│  └─────────────────────────┘  └─────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```
- Bouton principal **`+ Programme`** en haut à droite ; à sa droite un
  **`<KebabMenu>`** (⋮) de page pour les actions annexes éventuelles.
- Chaque **carte** : nom, compteur `n phases · m semaines`, aperçu des objectifs de
  phases, action **`Démarrer`** et un **⋮** par carte (Éditer, Dupliquer,
  Supprimer).
- État vide : encart d'amorçage « Crée ton premier programme ».

### 5.2 Éditeur de programme
```
┌───────────────────────────────────────────────────────────────┐
│  ‹ Programmes      Prise de masse 8 sem.      [ Démarrer ] ⋮   │
│  Description… (optionnel)                                      │
│                                                               │
│  ▸ Phase « Volume »   objectif: Prendre du volume      ⋮      │
│    ┌── S1 ──────────────────────────────────────────────┐    │
│    │ objectif: —            [ deload ☐ ]            ⋮    │    │
│    │  J1  J2        J3   J4        J5   J6   J7           │    │
│    │  [+] [💪Push]  [+]  [💪Pull]  [+]  [+]  [+]          │    │
│    └─────────────────────────────────────────────────────┘    │
│    ┌── S2 ──────────────────────────────────────────────┐    │
│    │ …                                                   │    │
│    └─────────────────────────────────────────────────────┘    │
│    [ + Semaine ]                                              │
│                                                               │
│  ▸ Phase « Affûtage »  objectif: …                    ⋮      │
│    ┌── S7 (deload) ─────────────────────────────────────┐    │
│    │ 🌙 Décharge          [ deload ☑ ]              ⋮    │    │
│    │  J1  J2   …                                          │    │
│    └─────────────────────────────────────────────────────┘    │
│  [ + Phase ]                                                  │
└───────────────────────────────────────────────────────────────┘
```
- **Colonne verticale** de phases ; chaque phase a un **nom** + champ **objectif**
  + ⋮ (renommer, supprimer, monter/descendre).
- Sous une phase, ses **semaines** `S1…Sn` : libellé `S{index}`, champ **objectif**,
  **toggle `deload`** (badge 🌙 quand actif), ⋮ (supprimer, déplacer).
- Sous une semaine, une **rangée J1…J7** (lun→dim). Chaque case : soit `+` (ajouter
  une séance), soit une **pastille séance** (icône `TYPE_META`, label) cliquable
  pour éditer. Plusieurs séances par jour empilées.
- **Ajouter une séance** ouvre un mini-choix : **`Partir de zéro`** (choix du type)
  ou **`Depuis un template`** (recherche + sélection → contenu copié inline). La
  saisie/édition réutilise **`EventFormModal`** en **mode « sans date »** (pas de
  champ date, choix du **jour J1…J7** à la place ; horaire optionnel).
- Couleurs des pastilles/badges via `TYPE_META` (hex concret côté SVG).

### 5.3 Modale « Démarrer le programme »
```
┌──────────────────────────────────────────────┐
│  Démarrer « Prise de masse 8 sem. »      ✕    │
│                                              │
│  Date de début :  [ 2026-07-01  ▾ ] (mer.)   │
│                                              │
│  Aperçu du placement                         │
│  ─────────────────────────────────────────   │
│  S1  ⚠ J1 (lun) Push  — ignorée (avant début)│
│      ⚠ J2 (mar) Pull  — ignorée              │
│      ✓ J4 (jeu 02/07) Push                    │
│      ✓ J6 (sam 04/07) Jambes                  │
│  S2  ✓ J1 (lun 07/07) Push … (8 séances)      │
│  …                                           │
│  ─────────────────────────────────────────   │
│  18 séances seront ajoutées · 2 ignorées.    │
│                                              │
│              [ Annuler ]   [ Confirmer ]      │
└──────────────────────────────────────────────┘
```
- Sélecteur de **date de début** (`input type="date"`), avec rappel du **jour de
  semaine** correspondant.
- **Aperçu** recalculé en direct : pour chaque séance, sa **date résolue** et son
  statut (`✓ placée` / `⚠ ignorée` car antérieure à la date de début en semaine
  partielle — cf. RG-04).
- Compteur récapitulatif. **`Confirmer`** crée les `training_events`, ferme la
  modale, **toast** « Programme démarré : N séances ajoutées au planning », et
  propose un lien « Voir dans le planning ».

### 5.4 Indicateur dans le planning (calendrier existant)
- Toute séance dont `program_label` est défini affiche un **préfixe/badge
  programme** dans son chip (ex. **`▣`** avant le label), distinct mais discret,
  par-dessus le code couleur `TYPE_META` du type.
- **Survol / `title`** : « Programme : {program_label}` — {program_objective}` ».
- **`EventDrawer`** (détail) : bandeau dédié « 🗓 Programme — {program_label} » et,
  si présent, « Objectif : {program_objective} ».
- Aucune autre différence de comportement : la séance reste éditable/supprimable
  individuellement.

---

## 6. Règles de gestion détaillées

### 6.1 Structure du programme
- **RG-01** — Un programme contient 0..n **phases** et 1..n **semaines**. Une
  semaine appartient à **au plus une** phase (ou à aucune).
- **RG-02** — Les semaines sont indexées **`S1…Sn`** ; `index` est **≥ 1** et
  **unique** par programme. La suppression d'une semaine **ne réindexe pas**
  automatiquement (l'éditeur propose la renumérotation).
- **RG-03** — Une **phase regroupe des semaines consécutives**. L'UI empêche une
  phase de couvrir des semaines non contiguës.

### 6.2 Démarrage & ancrage temporel
- **RG-04 (ancrage des jours)** — `J1 = lundi … J7 = dimanche`. Pour la semaine
  `Sn` (n = 1..N), le **lundi de référence** = `lundi(dateDébut) + (n − 1) × 7
  jours`. La date d'une séance de jour `Jd` = `lundiRéf + (Jd − 1) jours`.
- **RG-05 (semaine partielle)** — Toute séance de **S1** dont la date calculée est
  **strictement antérieure** à la date de début est **ignorée** (non placée). Les
  semaines `S2…Sn` sont toujours complètes.
  > **Exemple (confirmé PO)** : séances en **J2** et **J4**, démarrage un
  > **mercredi (J3)**. Lundi de réf. = lundi de la semaine du mercredi.
  > J2 = mardi = veille du début → **ignorée** ; J4 = jeudi = lendemain →
  > **placée**. On « commence donc à J4 ».
- **RG-06 (objectif résolu)** — Pour chaque séance placée :
  `objectif = semaine.objective ?? phase.objective ?? null`. Cette valeur est
  **figée** dans `program_objective` ; `program_label = programme.name`.
- **RG-07 (contenu placé)** — La séance placée est une **copie complète** du
  payload de la séance planifiée (type, exercices/séries, zone, titre,
  description, durée, horaire). Le `start_time` est repris s'il est défini, sinon
  la séance est « journée ».

### 6.3 Indépendance après démarrage
- **RG-08 (copies indépendantes)** — Après démarrage, **aucun lien** n'est conservé
  entre le programme et les séances créées. Modifier ou supprimer le programme
  **n'affecte pas** les séances déjà placées ; supprimer une séance placée se fait
  **à l'unité** dans le planning.
- **RG-09 (cohabitation)** — Plusieurs séances par jour sont autorisées. **Démarrer
  plusieurs programmes** (ou le même plusieurs fois), y compris sur des plages qui
  **se chevauchent**, est autorisé : chaque démarrage crée ses propres
  `training_events`. Aucune déduplication.

### 6.4 Deload
- **RG-10 (deload informatif)** — `is_deload` est **purement visuel** (badge 🌙
  dans l'éditeur et indicateur possible dans le planning via l'objectif). **Aucune**
  transformation automatique des charges ou du volume au placement.

### 6.5 Validation
- **RG-11** — `day_of_week ∈ [1..7]` ; `start_time` au format `HH:MM` si présent
  (réutiliser `isValidTimeStr`) ; `type` parmi `musculation | cardio | autre` ;
  `zone` parmi `Z1…Z5` ; champs hors-type ignorés (mêmes règles que les séances).
- **RG-12** — La **date de début** doit être un `YYYY-MM-DD` valide (réutiliser
  `isValidDateStr`). Le démarrage **dans le passé** est autorisé (cf. §9).
- **RG-13** — Un démarrage qui ne placerait **aucune** séance (programme vide, ou
  S1 entièrement antérieure et programme d'une seule semaine partielle) est
  **refusé** avec un message clair.

---

## 7. Micro-interactions & Feedback

- **Aperçu live** dans la modale de démarrage : changer la date recalcule
  instantanément dates et statuts `✓ / ⚠`.
- **Toast** de confirmation après démarrage (« N séances ajoutées · M ignorées »)
  avec lien « Voir dans le planning ».
- **Optimistic UI** dans l'éditeur (ajout/suppression de phase/semaine/séance
  reflété immédiatement, réconcilié au retour API).
- **Badge deload** animé discrètement à l'activation du toggle.
- **PR à l'usage** : les records ne sont **pas** déclenchés au démarrage (charges
  planifiées ≠ réalisées) ; ils restent calculés à l'édition réelle de la séance,
  comme aujourd'hui.

---

## 8. Accessibilité & Responsive

- Navigation clavier complète dans l'éditeur (ajout/suppression/déplacement via
  boutons focusables ; `<KebabMenu>` déjà géré clavier + `Échap`).
- La grille `J1…J7` reste lisible sur mobile : repli en **liste verticale par
  jour** sous un seuil de largeur ; libellés jours explicites (lun…dim) en plus
  des codes `Jx`.
- Indicateur programme **non porté par la seule couleur** : préfixe textuel/`title`
  + bandeau dans le détail.
- Cibles tactiles ≥ 40px ; couleurs SVG en **hex concret** (le SVG ne résout pas
  `var(--…)`).

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités**
- **Semaine partielle au démarrage** : séances antérieures à la date de début
  ignorées (RG-05), signalées dans l'aperçu.
- **Démarrage dans le passé** : autorisé (utile pour reconstituer un cycle déjà
  entamé) ; les séances tombent à leurs dates calculées, passées ou futures.
- **Chevauchement** avec des séances existantes ou d'un autre programme : autorisé,
  cohabitation (RG-09).
- **Objectif modifié après démarrage** : sans effet sur les séances déjà placées
  (snapshot, RG-08).

**Décision actée**
- Séance de programme **« journée » par défaut** (`start_time = null`) ; horaire
  **optionnel** par séance.
- Pas de réindexation automatique des semaines à la suppression (renumérotation
  proposée, non imposée).

**Questions ouvertes à trancher avec le PO**
- Faut-il un **garde-fou** anti-démarrage en double (avertir si un même programme a
  déjà été démarré sur une plage qui chevauche) ? *Proposé : simple avertissement,
  non bloquant.*
- L'indicateur planning doit-il afficher aussi le **repère `Sn / Jd`** d'origine de
  la séance (en plus de l'objectif) ? *Proposé : non en v1 (snapshot minimal).*
- Réutiliser **`EventFormModal`** tel quel en mode « sans date » vs créer une
  variante dédiée ? *Proposé : réutiliser avec un mode/prop, pour rester DRY.*

---

## 10. Backlog / Évolutions futures (V2+)

- **Lien vivant** programme ↔ séances placées : annulation groupée d'un programme
  démarré, replanification (décaler toutes les séances futures), suivi
  d'avancement.
- **Deload automatique** : réduction paramétrable de charge/volume sur les semaines
  marquées (ex. −40 %).
- **Progression automatique** des charges entre semaines (incréments par exercice,
  schémas linéaires/ondulatoires).
- **Templates de programmes** prêts à l'emploi et duplication rapide.
- **Statistiques de cycle** : adhérence (planifié vs réalisé), volume par phase,
  comparaison de cycles.
- **Vues calendrier enrichies** : surlignage d'un cycle en cours, ruban de phase.
- Import / export (JSON), partage (l'app reste mono-utilisateur pour l'instant).

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Une entrée **Programmes** apparaît dans le sous-menu Entraînement et liste les
      programmes existants.
- [ ] Je peux **créer** un programme, lui ajouter **phases**, **semaines** (`S1…Sn`)
      et **séances** par jour `J1…J7`.
- [ ] Une séance de programme peut être créée **en blanc** ou **depuis un template**
      (contenu copié inline).
- [ ] Une **phase** porte un objectif hérité par ses semaines ; une **semaine** peut
      surcharger l'objectif et être marquée **deload** (badge).
- [ ] **Démarrer** un programme à une date ouvre un **aperçu** des dates calculées et
      des séances **ignorées** en semaine partielle.
- [ ] Après confirmation, les **`training_events`** sont créés aux **bonnes dates**
      selon l'ancrage `J1=lundi…J7=dimanche` (RG-04).
- [ ] **Exemple de référence** : programme avec séances **J2** et **J4**, démarré un
      **mercredi**, ne place en **S1** que la séance **J4** ; S2+ sont complètes.
- [ ] Les séances placées portent **`program_label`** et **`program_objective`** et
      affichent un **indicateur** dans le planning + un bandeau dans le détail.
- [ ] Modifier/supprimer le programme **n'altère pas** les séances déjà placées
      (copies indépendantes, RG-08).
- [ ] Démarrages **multiples / chevauchants** autorisés sans déduplication (RG-09).
- [ ] Tous les libellés/messages sont en **français** ; couleurs SVG en **hex**.

---

> Spécification de référence du module parent :
> [`module_entrainement.md`](./module_entrainement.md). Ce document décrit
> **l'intention fonctionnelle** ; la doc `docs/training/` sera mise à jour lors de
> l'implémentation pour refléter l'état réel du code.
