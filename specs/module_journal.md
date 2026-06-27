# Module Journal / Humeur — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.0 · 2026-06-17
> Nouveau module de l'application. Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
>
> **Intention v1** : capter en quelques secondes l'**humeur du jour** + un **mot libre**, puis rendre ces notes **lisibles dans la durée** (calendrier-humeur, courbe) et **corrélables** aux autres modules (training, finances, habitudes).

---

## 1. Intention & Philosophie

Le module Journal matérialise le **ressenti dans le temps**. Son but n'est pas d'écrire de longues pages, mais de **poser un repère quotidien** : une humeur, quelques tags, deux phrases si l'envie est là. La valeur naît de l'**accumulation** : revoir un mois en couleurs, repérer les creux, et les **croiser** avec ce qu'on a fait (séances, dépenses, habitudes tenues).

Trois principes directeurs :

1. **Saisie en < 10 secondes.** Choisir une humeur = 1 clic. Le texte et les tags sont optionnels.
2. **La couleur raconte.** L'écran principal est un **calendrier teinté** par l'humeur : on « sent » son mois d'un coup d'œil.
3. **On observe, on ne juge pas.** Aucune notion de « bonne » ou « mauvaise » journée ; juste des données pour se comprendre.

Deux lectures de la même donnée :
- **Calendrier** — le quotidien, jour par jour (le présent).
- **Tendance** — la courbe d'humeur et les corrélations (le recul).

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Entrée (entry)** | La note d'une journée : humeur + tags + texte optionnels. **Au plus une entrée par jour.** |
| **Humeur (mood)** | Score ordinal sur une échelle **1 → 5** (😞 1, 😕 2, 😐 3, 🙂 4, 😄 5). Cœur de l'entrée. |
| **Tag** | Étiquette libre réutilisable (ex. `travail`, `sommeil`, `sport`, `famille`). Contextualise l'humeur. |
| **Note** | Texte libre court (markdown léger optionnel), facultatif. |
| **Calendrier-humeur** | Grille mensuelle où chaque jour est **teinté** selon l'humeur (du rouge au vert). |
| **Courbe d'humeur** | Évolution de l'humeur dans le temps (moyenne mobile lissée). |
| **Corrélation** | Mise en regard de l'humeur moyenne avec un signal d'un autre module (volume training, taux d'habitudes, flux finances) sur la même période. |

---

## 3. Périmètre (MVP)

Tout ce qui suit est **dans le MVP**.

- Créer / modifier / supprimer **l'entrée du jour** (et de jours passés) : humeur (1–5) obligatoire, tags et note optionnels.
- **Échelle d'humeur à 5 niveaux** avec emojis + couleur associée.
- **Tags** : création à la volée, autocomplétion, réutilisation ; gestion (renommer / fusionner / supprimer) dans un petit panneau.
- **Vue Calendrier — Mois** : grille teintée par l'humeur, navigation mois précédent/suivant, retour au mois courant.
- **Vue Tendance** : courbe d'humeur (jour + moyenne mobile 7 j) sur Mois/Année, filtrable par tag.
- **KPIs de période** : humeur moyenne, nb d'entrées (taux de remplissage), tag le plus fréquent.
- **Corrélations inter-modules** (lecture seule, opt-in si le module source existe) : humeur moyenne vs *jours d'entraînement*, vs *taux de complétion d'habitudes*, vs *dépenses* — sur la même fenêtre.
- **Recherche / filtre** des entrées par tag et par plage de dates.

> Hors MVP (backlog §10) : rappels, pièces jointes/photos, plusieurs entrées par jour, sentiment auto du texte, export PDF, météo.

---

## 4. Modèle de données

### Entité `JournalEntry`
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `date` | date (YYYY-MM-DD) | **Unique** : au plus une entrée par jour (date locale). |
| `mood` | int (1–5) | Obligatoire. |
| `note` | text \| null | Optionnel, max ~2000 car. |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto. |

### Entité `Tag`
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | Obligatoire, 1–24 car., **unique** (insensible à la casse). |
| `color` | string (hex/token) | Optionnel, défaut assigné. |

### Liaison `JournalEntryTag` (n–n)
| Champ | Type | Règles |
|---|---|---|
| `entryId` | UUID | FK → `JournalEntry` (cascade delete). |
| `tagId` | UUID | FK → `Tag`. |

**Règles structurelles :**
- Unicité **une entrée par `date`** : ressaisir le même jour = édition de l'entrée existante.
- Dates **locales** (pas d'UTC) ; « aujourd'hui » calculé sur le fuseau de l'appareil.
- Supprimer un tag le retire des entrées (les entrées restent) ; **fusionner** réaffecte les liaisons puis supprime le tag absorbé.
- Pas d'humeur sans entrée : l'absence d'entrée = jour neutre, exclu des moyennes.

---

## 5. Architecture des écrans (UX/UI)

### 5.0 Barre de contrôle (commune)
- **Sélecteur de vue** : `▦ Calendrier` · `📈 Tendance`.
- **Filtre de période** : `Mois` · `Année` (s'applique aux deux vues).
- **Navigateur** : `◄ ►` + libellé (« Juin 2026 » / « 2026 ») + **Aujourd'hui**.
- **Filtre par tag** (multi-sélection) commun aux deux vues.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Journal                                       [ + Note du jour ]    │
│   ◄  Juin 2026  ►      [ ▦ Calendrier │ 📈 Tendance ]   [ Mois │ Année ]│
│   Tags: [travail ×] [sommeil ×] [+]                     [ Aujourd'hui ] │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.1 Vue Calendrier — Mois (écran d'atterrissage)

```
┌───────────────────────────────────────────────────────────┐
│  Lun   Mar   Mer   Jeu   Ven   Sam   Dim                  │
│ ┌────┬────┬────┬────┬────┬────┬────┐                      │
│ │  1 │  2 │  3 │  4 │  5 │  6 │  7 │                       │
│ │ 🙂 │ 😐 │ 😄 │ ·  │ 😕 │ 😄 │ 🙂 │   (cases teintées)    │
│ ├────┼────┼────┼────┼────┼────┼────┤                      │
│ │  8 │  9 │ 10 │ 11 │ 12 │ 13 │ 14 │                       │
│ │ 😄 │ 🙂 │ 😐 │ 😞 │ 🙂 │ 😄 │ ·  │                       │
│ └────┴────┴────┴────┴────┴────┴────┘                      │
│  Humeur moyenne : 3,8 / 5   ·   12/14 jours notés          │
└───────────────────────────────────────────────────────────┘
```

- **Case = jour** : fond **teinté** selon l'humeur (gradient rouge→vert), emoji au centre, point/indicateur si une note texte existe (✎). Jour courant surligné, jours futurs neutres non cliquables.
- **Clic sur un jour** → ouvre le **drawer d'entrée** (5.3) pour saisir/éditer.
- **Pied de calendrier** : humeur moyenne du mois + taux de remplissage + tag dominant.
- **État vide** : « Note ta première journée pour commencer à suivre ton humeur » + bouton **+ Note du jour**.

### 5.2 Vue Tendance

- **Courbe d'humeur** : points journaliers (1–5) + **moyenne mobile 7 jours** lissée ; bande de fond colorée par paliers d'humeur.
- **Filtre par tag** : restreint la courbe/KPIs aux jours portant le(s) tag(s).
- **Panneau Corrélations** (cartes, lecture seule) — n'apparaît que si le module source a des données sur la période :
  - 🏋️ *Humeur les jours d'entraînement vs jours sans* (ex. « 4,1 vs 3,2 »).
  - ✅ *Humeur vs taux de complétion d'habitudes* (nuage de points + coefficient simple).
  - 💰 *Humeur vs dépenses du jour* (à titre indicatif, corrélation ≠ causalité — mention explicite).
- **Année** : granularité hebdomadaire (moyenne par semaine) pour rester lisible.

```
┌──────────────────────────────────────────────────────────────────────┐
│  humeur                                                                │
│   5 ┤        ╭╮          ╭───╮                                         │
│   4 ┤   ╭────╯╰──╮   ╭───╯   ╰──╮      ── moyenne 7j                   │
│   3 ┤───╯        ╰───╯          ╰────  • humeur du jour               │
│   2 ┤                                                                  │
│   1 ┼──────────────────────────────────────────────►                  │
│       1     7     14     21     28   (jours)                           │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Drawer d'entrée (saisie / édition)

Déclenché par **+ Note du jour**, clic sur un jour du calendrier, ou édition.

- **Sélecteur d'humeur** : 5 gros boutons emoji (😞😕😐🙂😄), focus auto, sélection = 1 clic. **Obligatoire**.
- **Tags** : champ d'autocomplétion ; saisir un nom inexistant propose « Créer "x" ». Chips supprimables.
- **Note** : zone de texte optionnelle (markdown léger), compteur discret.
- **Date** : par défaut aujourd'hui, modifiable (date picker) pour saisir une journée passée.
- Actions : **Enregistrer** / **Annuler** ; en édition, **Supprimer** (confirmation).

### 5.4 Panneau Tags
- Liste des tags avec compteur d'usage, couleur, actions **Renommer / Fusionner / Supprimer**.
- Fusion : « Fusionner *sport* dans *training* ? Les 14 entrées seront réaffectées. »

---

## 6. Règles de gestion détaillées

- **RG-01** — Au plus **une entrée par date**. Saisir un jour déjà noté = édition.
- **RG-02** — `mood` est **obligatoire** (1–5) ; tags et note facultatifs. Une entrée sans humeur n'existe pas.
- **RG-03** — Édition libre du **passé** ; jours **futurs** non saisissables.
- **RG-04** — Couleur de case dérivée du `mood` (échelle continue 1→5, rouge→vert), indépendante de la couleur des tags.
- **RG-05** — **Humeur moyenne** d'une période = moyenne des `mood` des jours **notés** (les jours sans entrée sont exclus, jamais comptés comme 0).
- **RG-06** — **Taux de remplissage** = jours notés / jours écoulés de la période (hors futur).
- **RG-07** — **Tag unique** par nom (insensible à la casse) ; renommer vers un nom existant déclenche une **fusion**.
- **RG-08** — **Corrélations** : calculées sur l'intersection des jours où les deux signaux existent ; affichées seulement si ≥ 7 points communs (sinon « pas assez de données »). Toujours accompagnées de l'avertissement *corrélation ≠ causalité*.
- **RG-09** — Supprimer une entrée supprime ses liaisons de tags (cascade), pas les tags eux-mêmes.
- **RG-10** — Toutes les dates sont **locales** ; « aujourd'hui » réévalué à l'ouverture/focus.

---

## 7. Micro-interactions & Feedback

- **Sélection d'humeur** : l'emoji choisi grossit légèrement + la couleur d'accent du drawer s'adapte à l'humeur.
- **Enregistrement optimiste** : la case du calendrier se teinte immédiatement ; rollback + toast en cas d'échec.
- **Tag créé à la volée** : feedback « Tag créé » discret.
- **Recentrage** : « Aujourd'hui » ramène au mois/jour courant.
- **Transition vue/période** : douce, sans rechargement perçu.

---

## 8. Accessibilité & Responsive

- Sélecteur d'humeur = **radiogroup** accessible ; chaque option annonce « Humeur {n} sur 5, {label} ».
- L'humeur ne repose **pas que sur la couleur** : emoji + valeur numérique au survol/tooltip (daltonisme).
- Calendrier navigable au clavier ; Entrée/Espace ouvre le drawer du jour focalisé.
- **Mobile** : calendrier en pleine largeur, drawer en bottom-sheet ; la vue Tendance privilégiée pour la lecture.
- Contraste des cases teintées vérifié pour la lisibilité de l'emoji.

---

## 9. Cas limites

- Jour déjà noté rouvert → drawer pré-rempli (édition, pas doublon).
- Mois à 28–31 jours → grille dynamique ; semaines partielles affichées normalement.
- Période sans aucune entrée → calendrier neutre, courbe vide + message ; moyenne = « — ».
- Tag fusionné qui crée un doublon de liaison sur une entrée → dédupliqué.
- Module source (training/habitudes/finances) absent ou vide → carte de corrélation masquée.
- Changement de fuseau / passage de minuit → « aujourd'hui » réévalué.

---

## 10. Backlog / Évolutions futures (hors MVP)

- **Rappel quotidien** (notification douce le soir).
- **Photos / pièces jointes** par entrée.
- **Analyse de sentiment** du texte (auto-suggestion d'humeur).
- **Plusieurs entrées par jour** (matin/soir).
- **Météo** ou autres signaux contextuels automatiques.
- **Export** PDF/markdown d'une période.
- **Corrélations avancées** (poids, sommeil) une fois les modules concernés enrichis — lien avec [`module_sante.md`](./module_sante.md).

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Je peux enregistrer l'humeur du jour en un clic (échelle 1–5) ; tags et note sont optionnels.
- [ ] Une seule entrée par date ; rouvrir un jour noté l'édite (pas de doublon).
- [ ] La **vue Calendrier — Mois** teinte chaque jour selon l'humeur et indique les notes texte.
- [ ] La **vue Tendance** affiche la courbe d'humeur + moyenne mobile 7 j, filtrable par tag, sur Mois/Année.
- [ ] Les **KPIs** (humeur moyenne sur jours notés, taux de remplissage, tag dominant) sont exacts.
- [ ] Je peux créer/réutiliser des **tags**, les renommer, fusionner, supprimer.
- [ ] Les **corrélations** inter-modules s'affichent seulement avec ≥ 7 points communs, avec l'avertissement causalité.
- [ ] Édition libre du passé ; jours futurs non saisissables.
- [ ] Supprimer une entrée demande confirmation et n'efface pas les tags.
- [ ] Toutes les dates sont locales ; « Aujourd'hui » recentre correctement.
