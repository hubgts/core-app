# Module Habitudes — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 2.0 · 2026-06-14
> Module 2 de l'application **Progression**. Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp_v1.md`](./mvp_v1.md).
>
> **Changements v2.0** : périmètre recentré sur le MVP uniquement ; ajout de l'**objectif hebdomadaire** par habitude (X fois/semaine) ; ajout d'un **sélecteur de vue** (Grille / Graphique) et d'un **filtre de période** (Mois / Année) ; ajout de la **vue Graphique** (courbes de progression cumulée) et de la **vue Grille annuelle** (heatmap condensée) ; streak rendu **adaptatif** (jours ou semaines selon l'objectif).

---

## 1. Intention & Philosophie

Le module Habitudes matérialise la **discipline sans motivation**. Son but n'est pas de planifier ou de rappeler, mais de **rendre visible la constance** : un mur de cases que l'on coche jour après jour, où l'on voit d'un seul regard ses séries (*streaks*) et ses trous.

Trois principes directeurs :

1. **Friction zéro.** Cocher une case = 1 clic. Pas de formulaire, pas de confirmation, pas de saisie de texte au quotidien.
2. **La vue prime sur la donnée.** L'écran principal est une grille dense et lisible : on doit « sentir » sa période en un coup d'œil (plein de cases pleines = bonne période).
3. **On ne juge pas, on constate.** Pas de culpabilisation ; les trous sont neutres.

Deux lectures complémentaires de la même donnée (voir §5) :
- **Grille** — la constance, case par case (le présent, l'action quotidienne).
- **Graphique** — la progression, dans la durée (la tendance, l'élan).

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Habitude** | Une routine à suivre, suivie de façon binaire chaque jour (ex : « Méditer », « Lecture 10 min »). |
| **Objectif hebdomadaire** | Nombre de fois par semaine où l'habitude doit être tenue (1 à 7). Détermine les jours « attendus », le calcul du streak et du taux de complétion. Une habitude à **7/7** est dite *quotidienne*. |
| **Coche (check)** | L'enregistrement « habitude tenue » pour une habitude un jour donné. Binaire : présente ou absente. |
| **Vue Grille** | Le tableau habitudes × jours (case par case). Déclinée en **vue mois** et **vue année**. |
| **Vue Graphique** | Les **courbes de progression cumulée** (une par habitude) sur la période choisie. |
| **Période** | Fenêtre temporelle affichée : **Mois** ou **Année**. S'applique aux deux vues. |
| **Semaine** | Du lundi au dimanche (ISO). Unité de référence de l'objectif hebdomadaire. |
| **Streak (série en cours)** | Pour une habitude **quotidienne** : nb de jours consécutifs cochés. Pour une habitude à **objectif hebdo** : nb de semaines consécutives où l'objectif a été atteint (voir §6.2). |
| **Record (best streak)** | La plus longue série jamais réalisée (même unité que le streak de l'habitude). |
| **Palier (milestone)** | Seuil de série remarquable atteint. Sert de base au futur système de points. |
| **Taux de complétion** | % de coches réalisées sur les coches **attendues** d'une période (objectif × semaines). |
| **Rythme cible** | Trajectoire idéale sur la vue Graphique : droite reliant 0 au total attendu en fin de période. Sert de référence (au-dessus = en avance, en-dessous = en retard). |

---

## 3. Périmètre (MVP)

Tout ce qui suit est **dans le MVP**.

- Créer / modifier / archiver / supprimer une habitude, avec **objectif hebdomadaire** (1 à 7 fois/semaine).
- **Vue Grille — Mois** : grille mensuelle, navigation mois précédent / suivant, retour au mois courant.
- **Vue Grille — Année** : heatmap annuelle condensée (façon GitHub), une ligne par habitude.
- **Vue Graphique** : courbes de progression cumulée par habitude, avec rythme cible, sur Mois ou Année.
- **Sélecteur de vue** (Grille / Graphique) et **filtre de période** (Mois / Année).
- Cocher / décocher une cellule (habitude × jour) pour le passé et aujourd'hui.
- Indicateur d'**avancement hebdomadaire** visible sur la grille (« où j'en suis cette semaine » : ex. 2/3).
- Calcul et affichage : streak en cours (adaptatif), record, taux de complétion, paliers atteints.
- Réordonner les habitudes (drag & drop).

> Tout le reste (habitudes quantitatives, rappels, catégories, UI de gamification, statistiques avancées) est **hors périmètre MVP** — voir le bref backlog §10.

---

## 4. Modèle de données

### Entité `Habit`
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | Obligatoire, 1–40 caractères. Unique parmi les habitudes actives (insensible à la casse). |
| `weeklyTarget` | int | **Nouveau.** Objectif hebdomadaire, 1 à 7. Défaut `7` (quotidienne). |
| `color` | string (hex/token) | Optionnel. Couleur d'accent de la ligne, des coches et de la courbe. Défaut assigné si non fourni. |
| `icon` | string | Optionnel. Emoji ou nom d'icône. |
| `position` | int | Ordre d'affichage (drag & drop). |
| `status` | enum | `active` \| `archived`. Défaut `active`. |
| `createdAt` | datetime | Auto. |
| `archivedAt` | datetime \| null | Renseigné à l'archivage. |

### Entité `HabitCheck`
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `habitId` | UUID | FK → `Habit`. |
| `date` | date (YYYY-MM-DD) | Jour concerné, sans heure (date locale de l'utilisateur). |
| `createdAt` | datetime | Auto. |

**Règles structurelles :**
- Unicité : **un seul `HabitCheck` par couple `(habitId, date)`**. Cocher = créer la ligne, décocher = la supprimer. L'absence de ligne = non coché.
- Pas d'état « raté » stocké : l'absence vaut « non fait ».
- L'objectif hebdomadaire **ne fige pas des jours précis** : l'utilisateur reste libre de cocher n'importe quel jour. `weeklyTarget` est une **cible de volume**, pas un planning de jours imposés (ce dernier est en backlog §10).
- Les dates sont **locales** (pas d'UTC). Le « jour courant » est calculé sur le fuseau de l'appareil.

---

## 5. Architecture des écrans (UX/UI)

### 5.0 Barre de contrôle (commune à toutes les vues)

Deux axes **indépendants**, regroupés dans un bandeau au-dessus du contenu :

- **Sélecteur de vue** (segmented control) : `▦ Grille` · `📈 Graphique`.
- **Filtre de période** (segmented control) : `Mois` · `Année`.
- **Navigateur de période** : flèches `◄ ►` + libellé contextuel (« Juin 2026 » en Mois, « 2026 » en Année) + bouton **Aujourd'hui** (recentre sur la période courante).

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Habitudes                                          [ + Habitude ]   │
│                                                                        │
│   ◄  Juin 2026  ►          [ ▦ Grille │ 📈 Graphique ]   [ Mois │ Année ] │
│                                                  [ Aujourd'hui ]        │
└──────────────────────────────────────────────────────────────────────┘
```

Les quatre combinaisons possibles :

| Vue \ Période | **Mois** | **Année** |
|---|---|---|
| **Grille** | Grille mensuelle dense (§5.1) | Heatmap annuelle condensée (§5.2) |
| **Graphique** | Courbes de progression sur le mois (§5.3) | Courbes de progression sur l'année (§5.3) |

> La vue et la période sélectionnées sont **mémorisées** (au moins le temps de la session) pour ne pas réinitialiser à chaque retour.

### 5.1 Vue Grille — Mois (écran d'atterrissage)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              1  2  3  4  5  6  7 │ 8  9 10 11 12 13 14 │15 ... 30   sem.  🔥   │
│              L  M  M  J  V  S  D │ L  M  M  J  V  S  D │ L      M           │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ 🧘 Méditer    ✓  ✓  ✓  ·  ✓  ✓  ✓ │ ✓  ✓  ·  ·  ✓  ◻  ◻ │◻ ...  ◻   2/3 ● 🔥12 │
│  │   (7/sem)                                                              │      │
│  │ 📖 Lecture    ✓  ·  ✓  ✓  ·  ·  · │ ✓  ✓  ✓  ·  ·  ◻  ◻ │◻ ...  ◻   3/3 ✓ 🔥 5 │
│  │   (3/sem)                                                              │      │
│  │ 🏃 Courir     ·  ·  ✓  ·  ·  ✓  · │ ✓  ·  ·  ✓  ·  ◻  ◻ │◻ ...  ◻   1/3 ◔ 🔥 2 │
│  │   (3/sem)                                                              │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│  Complétion du mois : 78 %              Meilleure série en cours : 12 j 🔥      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Anatomie :**
- **En-tête de colonnes** : numéro du jour + initiale du jour de semaine. **Week-ends teintés**, **colonne du jour courant surlignée**. Des **séparateurs verticaux délimitent les semaines** (lundi → dimanche), pour lire l'objectif hebdo « en blocs ».
- **Lignes = habitudes** : icône + nom à gauche (colonne **figée/sticky**), sous le nom un libellé discret de l'objectif (`3/sem`, ou rien si `7/sem`), puis une cellule par jour.
- **Rail de droite** (par habitude) :
  - **Avancement de la semaine courante** : `coches faites / objectif` (ex. `2/3`) accompagné d'un **anneau de progression** (`◔ ◑ ◕ ✓`). C'est la réponse directe à « où j'en suis cette semaine ». Vert/plein dès que l'objectif est atteint.
  - **Streak** : 🔥 + nombre (jours ou semaines selon l'habitude — un libellé/ tooltip précise l'unité, ex. `🔥3 sem`).
- **Pied de grille** : taux de complétion du mois + meilleure série en cours.

**Repère d'objectif hebdo dans la grille (au-delà du rail) :**
- Pour chaque **semaine écoulée**, un **point de statut** sous le bloc de la semaine indique si l'objectif a été atteint (● plein = atteint, ○ vide = manqué). Cela rend l'historique hebdomadaire lisible sans quitter la grille.
- La **semaine courante** n'est jamais marquée « manquée » tant qu'elle n'est pas finie (cohérent avec la tolérance du streak, §6.2).

**Comportements de mise en page :**
- Première colonne (nom) **figée** ; la grille des jours scrolle horizontalement sur écran étroit.
- Nombre de colonnes adapté aux mois de 28–31 jours.
- **État vide** (aucune habitude) : illustration + « Crée ta première habitude pour commencer à suivre ta régularité » + bouton **+ Habitude**.

### 5.2 Vue Grille — Année (heatmap condensée)

But : un **visuel d'ensemble** de l'année, façon « contributions GitHub ». Une **ligne par habitude**, chaque ligne = une bande de cellules (1 cellule = 1 jour) regroupées par mois.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│            Jan   Fév   Mar   Avr   Mai   Jun   Jui   Aoû   Sep   Oct   Nov   Déc │
│ 🧘 Méditer ▪▪▫▪▪ ▪▪▪▪▪ ▫▪▪▪▪ ▪▪▪▪▫ ▪▪▪▪▪ ▪▪▪░░ ░░░░░ ░░░░░ ...        81 % │
│ 📖 Lecture ▪▫▪▫▪ ▫▪▪▫▪ ▪▪▫▪▫ ▪▫▪▪▫ ▫▪▪▫▪ ▪▪▫░░ ░░░░░ ...               63 % │
│ 🏃 Courir  ▫▫▪▫▫ ▪▫▫▪▫ ▫▪▫▫▪ ▫▪▫▫▫ ▪▫▫▪▫ ▫▪░░░ ░░░░░ ...               44 % │
└────────────────────────────────────────────────────────────────────────────────┘
   ▪ coché   ▫ attendu non coché   ░ futur / hors période        (à droite : % année)
```

- **Cellule** : pleine (couleur de l'habitude) si cochée, vide si jour passé non coché, neutre/grisée si futur ou antérieur à la création.
- **Intensité optionnelle** : on peut moduler l'opacité par densité hebdomadaire, mais le binaire suffit au MVP.
- **Labels de mois** alignés au-dessus ; **séparation visuelle légère** entre mois.
- **À droite** : taux de complétion **de l'année** par habitude.
- **Interaction** : survol d'une cellule → tooltip `{habitude} · {date} · coché/non`. Le clic peut **basculer en vue Mois sur le mois concerné** (pratique pour corriger) ; la correction case par case se fait en vue Mois, pas ici (cellules trop petites pour un toggle fiable).
- **Responsive** : sur mobile, scroll horizontal ou repli sur un sous-ensemble de mois ; la vue Année reste avant tout contemplative.

### 5.3 Vue Graphique — Courbes de progression

But : voir **l'élan dans la durée**. Une **courbe cumulée par habitude** : le total de coches qui s'accumule sur la période.

- **Axe X** : le temps sur la période choisie (jours du mois, ou semaines/mois de l'année).
- **Axe Y** : **nombre cumulé de coches** depuis le début de la période.
- **Forme** : la courbe **reste plate les jours non cochés** et **monte les jours cochés** — exactement « ligne droite si pas coché, ça grimpe si coché ». Rendu en **courbe lissée** (spline monotone, jamais décroissante).
- **Rythme cible** (par habitude ou global) : une **droite de référence** reliant 0 (début) au **total attendu** en fin de période (`objectif hebdo × nb semaines`). Être **au-dessus** = en avance, **en-dessous** = en retard. C'est ce qui donne du sens à la courbe.
- **Légende** : une entrée par habitude (couleur), avec possibilité de **masquer/afficher** une courbe pour comparer.

```
┌──────────────────────────────────────────────────────────────────────┐
│  coches cumulées                                                       │
│   30 ┤                                            ╭──── 🧘 Méditer     │
│      │                                   ╭────────╯                    │
│   20 ┤                          ╭────────╯   · · · · · rythme cible    │
│      │                 ╭────────╯      ╭──────── 📖 Lecture            │
│   10 ┤        ╭────────╯       ╭───────╯                               │
│      │ ╭──────╯       ╭────────╯  ____________ 🏃 Courir               │
│    0 ┼─┴───────┴───────┴───────┴───────┴───────┴──────────►           │
│        1       7       14      21      28      (jours)                 │
└──────────────────────────────────────────────────────────────────────┘
```

- **Mois** : granularité au jour. **Année** : granularité à la semaine (ou au mois) pour rester lisible — la logique cumulée et le rythme cible sont identiques.
- **État vide** : si aucune coche sur la période, courbes plates à 0 + message discret.
- **Interaction** : survol → tooltip `{habitude} · {date} · {total cumulé}`. Pas d'édition depuis le graphique (lecture seule).

> **Pourquoi cumulé plutôt que streak en courbe ?** Une courbe de streak redescend brutalement à chaque trou (anxiogène et illisible à plusieurs habitudes). La courbe cumulée ne descend jamais : elle traduit la **progression** demandée, et l'écart au rythme cible dit tout de la régularité.

### 5.4 Création / édition d'une habitude (modale)

Déclenché par **+ Habitude** ou clic sur le nom d'une habitude (édition).

Champs :
- **Nom** (obligatoire, max 40 car.) — focus auto à l'ouverture.
- **Objectif hebdomadaire** : sélecteur **1 à 7 fois / semaine** (défaut 7 = tous les jours). Libellé d'aide : « Combien de fois par semaine veux-tu tenir cette habitude ? ».
- **Icône** (sélecteur d'emoji, optionnel).
- **Couleur** (palette de 8–10 teintes prédéfinies).
- (Édition uniquement) actions **Archiver** et **Supprimer**.

Boutons : **Annuler** / **Enregistrer**. Validation : nom non vide et non dupliqué (sinon « Une habitude porte déjà ce nom »). Modifier l'objectif **recalcule** streak / complétion / paliers sur tout l'historique (voir §6).

### 5.5 Réorganisation

- **Drag & drop** des lignes pour changer l'ordre (`position`). Poignée visible au survol/mobile (⠿).
- Ordre persistant et identique sur toutes les vues et périodes.

---

## 6. Règles de gestion détaillées

### 6.1 Cocher / décocher
- **RG-01** — Une cellule n'est interactive que si `date ≤ aujourd'hui`. Jours futurs non cliquables.
- **RG-02** — Cocher crée un `HabitCheck (habitId, date)` ; décocher le supprime. Idempotent.
- **RG-03** — La correction du passé est **libre** sur tout l'historique de l'habitude.
- **RG-04** — Une habitude `archived` n'est plus cochable ; son historique reste consultable en lecture seule.
- **RG-05** — Le toggle se fait **uniquement en vue Grille — Mois** (cellules assez grandes). Les vues Année et Graphique sont en lecture seule.

### 6.2 Calcul du streak (adaptatif selon l'objectif)
- **RG-06 — Habitude quotidienne (`weeklyTarget = 7`)** : streak = nombre de **jours consécutifs** cochés en remontant depuis le jour de référence (unité affichée : *jours*).
- **RG-07 — Habitude à objectif hebdo (`weeklyTarget < 7`)** : streak = nombre de **semaines consécutives** où l'objectif a été atteint (`coches de la semaine ≥ weeklyTarget`), en remontant depuis la semaine de référence (unité affichée : *semaines*).
- **RG-08 — Tolérance « période en cours pas encore finie »** :
  - *Quotidienne* : si aujourd'hui n'est pas coché mais qu'hier l'était, le streak court jusqu'à hier ; il n'est rompu qu'une fois un **jour entièrement écoulé** resté non coché.
  - *Hebdo* : la **semaine courante** ne casse jamais le streak tant qu'elle n'est pas terminée ; elle ne le **prolonge** que si l'objectif y est déjà atteint. Une semaine **passée** sous l'objectif rompt le streak.
- **RG-09** — Le **record** (best streak) utilise la même unité que le streak de l'habitude ; il est recalculé à chaque modification et ne diminue que si l'historique qui le portait est décoché. Changer `weeklyTarget` **recalcule** le record dans la nouvelle unité.

### 6.3 Taux de complétion
- **RG-10** — Coches **attendues** sur une période = `weeklyTarget × nombre de semaines de la période` (proratisé pour les semaines partielles en début/fin de période et après la date de création). Taux d'une habitude = `coches réalisées / coches attendues`, **plafonné à 100 %** (faire plus que l'objectif ne dépasse pas 100 %).
- **RG-11** — Le taux se calcule sur la **période complète affichée** (passé + à venir), car l'utilisateur peut cocher des jours passés à tout moment. Seule la période **antérieure à la création** est exclue.
- **RG-12** — Taux global = moyenne pondérée sur les coches attendues, toutes habitudes actives confondues.

### 6.4 Avancement hebdomadaire (indicateur de grille)
- **RG-13** — Pour chaque semaine, `avancement = min(coches de la semaine, weeklyTarget)` ; affiché `avancement/weeklyTarget`. L'anneau se remplit proportionnellement ; il est marqué « atteint » dès `coches ≥ weeklyTarget`.
- **RG-14** — Une semaine est **« objectif atteint »** (point ● en grille) si `coches ≥ weeklyTarget`. La semaine courante n'est jamais marquée « manquée » avant sa fin (RG-08).

### 6.5 Paliers
- **RG-15** — Paliers surveillés sur le streak : **7, 30, 100, 365** (en *jours* pour les quotidiennes ; en *semaines*, paliers **4, 12, 26, 52** pour les habitudes hebdo). Atteindre exactement un palier émet/logge `milestone_reached { habitId, milestone, unit, date }`.
- **RG-16** — Ces évènements sont **persistés** (ou recalculables) pour alimenter plus tard le moteur de points. Au MVP : feedback visuel seulement (§7), aucun score affiché.

### 6.6 Cycle de vie d'une habitude
- **RG-17 — Archiver** : retire l'habitude des vues actives sans supprimer ses checks (réversible).
- **RG-18 — Supprimer** : suppression définitive de l'habitude **et** de tous ses checks → **confirmation explicite** (« Supprimer "Méditer" et tout son historique ? Cette action est irréversible. »).
- **RG-19** — Le nom doit rester unique parmi les habitudes **actives** ; un nom archivé/supprimé peut être réutilisé.

---

## 7. Micro-interactions & Feedback

- **Toggle optimiste** : la cellule change d'état immédiatement ; en cas d'échec, rollback visuel + toast d'erreur discret.
- **Animation de check** : remplissage + léger rebond (~150 ms).
- **Objectif hebdo atteint** : quand l'anneau d'avancement se complète, petit feedback (l'anneau « se ferme » + teinte de validation).
- **Franchissement de palier** : animation renforcée sur la ligne (halo, confettis légers) + toast (« 🔥 7 jours d'affilée sur Méditer ! » / « 🔥 4 semaines de Courir ! »). Non bloquant.
- **Mise à jour live** : streak, anneau hebdo et KPIs de pied de grille se recalculent instantanément après chaque toggle.
- **Changement de vue/période** : transition douce ; pas de rechargement perçu.
- **Recentrage** : « Aujourd'hui » ramène la période courante et scrolle sur le jour J.

---

## 8. Accessibilité & Responsive

- **Sélecteurs vue/période** : vrais boutons radio accessibles (rôle, état sélectionné annoncé).
- **Clavier** : navigation dans la grille (flèches de cellule en cellule, Espace/Entrée pour toggler).
- **Lecteurs d'écran** : chaque cellule annonce « {Habitude}, {date}, {coché|non coché} » ; le rail annonce « {habitude}, {n}/{objectif} cette semaine, série {n} {jours|semaines} ».
- **Contraste / daltonisme** : l'état coché ne repose pas que sur la couleur (forme + remplissage ✓). La heatmap fournit un tooltip textuel.
- **Cibles tactiles** : cellules ≥ 32×32 px en vue Mois. En vue Année (cellules petites), pas de toggle — seulement survol/clic vers le mois.
- **Mobile** : première colonne sticky + scroll horizontal en grille ; la vue Graphique et la heatmap Année sont les écrans privilégiés en lecture sur petit écran.

---

## 9. Cas limites

- Mois à 28/29/30/31 jours → colonnes dynamiques ; semaines partielles proratisées (RG-10).
- Habitude créée en milieu de période → cases/semaines antérieures à la création non éligibles (grisées, non cliquables, exclues des taux).
- Changement de `weeklyTarget` → streak, record, complétion et paliers **recalculés** ; l'unité du streak peut changer (jours ↔ semaines).
- Changement de fuseau / passage de minuit → « jour courant » réévalué à l'ouverture/focus.
- Décochage d'un jour qui portait le record → record recalculé.
- Semaine à cheval sur deux mois (vue Mois) : l'avancement hebdo et le point de statut se calculent sur la **semaine ISO complète**, même si une partie déborde du mois affiché.
- Aucune coche sur la période (Graphique) → courbes plates à 0, rythme cible affiché.

---

## 10. Backlog / Évolutions futures (hors MVP)

- **Jours imposés** : objectif sur jours précis (lun/mer/ven) plutôt qu'en volume hebdo.
- **Habitudes quantitatives** : objectif chiffré (2 L, 8000 pas) avec complétion partielle.
- **Rappels / notifications** ; **catégories / piliers**.
- **Gamification** branchée sur les données déjà produites (points, niveaux, badges, score au Dashboard).
- **Statistiques avancées** : taux par jour de semaine, corrélations inter-modules.
- **Annotations** de journée.

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Je peux créer une habitude avec un nom et un **objectif hebdomadaire (1–7)** ; un nom dupliqué actif est refusé.
- [ ] Un **sélecteur de vue** (Grille / Graphique) et un **filtre de période** (Mois / Année) sont disponibles et combinables ; le choix est mémorisé.
- [ ] **Grille — Mois** : jours en colonnes, habitudes en lignes, week-ends teintés, jour courant surligné, séparateurs de semaine.
- [ ] Le **rail de droite** affiche l'**avancement de la semaine** (`n/objectif` + anneau) et le **streak** dans la bonne unité (jours ou semaines).
- [ ] Cliquer une cellule (≤ aujourd'hui) coche/décoche instantanément ; futurs non cliquables ; toggle uniquement en vue Mois.
- [ ] Le **streak** est exact et adaptatif : jours consécutifs (quotidienne) ou semaines d'objectif atteint (hebdo), avec tolérance de période en cours (RG-08).
- [ ] Le **taux de complétion** se base sur `objectif × semaines` (RG-10), plafonné à 100 %, hors période antérieure à la création.
- [ ] **Grille — Année** : heatmap condensée, une ligne par habitude, % annuel à droite, clic vers le mois.
- [ ] **Graphique** : une courbe cumulée par habitude (plate si non coché, montante si coché), lissée, jamais décroissante, avec **rythme cible**, sur Mois et Année.
- [ ] L'atteinte d'un **palier** déclenche un feedback visuel et émet un évènement persistant.
- [ ] Je peux **réordonner** (drag & drop, ordre persistant), **archiver** (réversible) et **supprimer** (confirmation, irréversible) une habitude ; l'historique archivé reste consultable.
