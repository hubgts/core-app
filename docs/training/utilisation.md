# Module Entraînement — Guide d'utilisation

> Ce document décrit **comment utiliser** le module Entraînement tel qu'il est
> implémenté aujourd'hui. Pour le fonctionnement interne (code, API, calculs),
> voir [`technique.md`](./technique.md).

---

## 1. À quoi sert ce module ?

Le module Entraînement est un **journal d'activités physiques** : on **logge vite**
ce qu'on a fait, et l'application en tire une **progression mesurable** (tonnage,
records, volume, temps). L'écran principal est un **calendrier**.

Chaque séance a un **type** qui ouvre un formulaire adapté. Le MVP gère **trois
types** : **Musculation**, **Cardio**, **Autre**.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Séance / Évènement** | Une activité loggée pour un jour donné (un jour peut en contenir plusieurs). |
| **Type** | Musculation, Cardio ou Autre. Détermine le formulaire et les stats. |
| **Horaire** | Heure de début **optionnelle**. Sans horaire = évènement « journée ». |
| **Durée** | Temps de la séance en minutes (optionnel). |
| **Ressenti** | Note subjective de 1 à 5 (optionnel). |
| **Exercice / Série** | (Musculation) Un mouvement nommé, contenant des séries `reps × charge`. |
| **Tonnage** | (Musculation) `Σ (reps × charge)` d'une séance. |
| **Charge max / PR** | (Musculation) Charge la plus lourde par exercice ; un nouveau record = PR. |
| **Zone (Z1–Z5)** | (Cardio) Zone de fréquence cardiaque de la séance. |

---

## 3. Les vues du calendrier

En haut de l'écran, un sélecteur propose deux vues du calendrier :

- **Semaine** : grille horaire (6 h → 23 h) ; les évènements horodatés se placent à
  leur heure, les évènements « journée » en tête.
- **Mois** : grille mensuelle ; chaque jour montre des pastilles colorées par type.

Les flèches `‹ ›` font défiler la période ; un bouton revient à la période courante.

---

## 4. Ajouter / modifier une séance

### Ajouter
- **Cliquer sur un jour** (vue Mois) ou un **créneau** (vue Semaine) ouvre le
  formulaire de création, pré-rempli avec la date / l'heure cliquée.
- **Choisir le type**, puis remplir le **socle commun** (horaire, durée, ressenti —
  tous optionnels) et les champs spécifiques (voir §5/§6).
- **Enregistrer**.

### Détail / modifier / supprimer
- **Cliquer un évènement** ouvre son **détail dans un panneau latéral** (off-canvas).
- De là, on peut **modifier** ou **supprimer** la séance.

---

## 5. Musculation

- On ajoute des **exercices**, chacun avec une ou plusieurs **séries** (`reps` ×
  `charge` en kg ; charge `0` autorisée = poids du corps).
- Le **nom d'exercice** est **auto-complété** à partir des exercices déjà saisis,
  pour que les stats de progression se **consolident** par exercice.
- L'application calcule le **tonnage** de la séance et suit la **charge max** par
  exercice. Atteindre une nouvelle charge max sur un exercice déclenche un **PR**
  (record) signalé à l'enregistrement.

---

## 6. Cardio & Autre

- **Cardio** : **zone d'intensité** (Z1 à Z5, barème de fréquence cardiaque),
  **durée** (temps global) et **description**.
- **Autre** : **titre** + **description** libres ; sert au suivi de régularité.

---

## 7. Statistiques

> La **vue Statistiques du module a été retirée** ; elle sera refaite plus tard.
> Un résumé d'entraînement reste visible dans le **Dashboard** (séances et durée du
> jour / de la semaine).

---

## 8. Programmes / cycles

Sous-page **Programmes** du menu Entraînement (`/entrainement/programmes`). On y
construit des **cycles réutilisables** puis on les déroule dans le planning.

- **Structure** : un programme contient des **phases** (ex. « Volume », « Force »,
  qui portent un objectif) et des **semaines** `S1…Sn`. Chaque semaine peut être
  rattachée à une phase, porter son propre objectif et être marquée **deload** 🌙.
- **Séances** : dans chaque semaine, on ajoute des séances par **jour** `J1…J7`
  (**J1 = lundi … J7 = dimanche**), soit **de zéro**, soit **depuis un template**.
- **Démarrer** : on choisit une **date de début** ; un **aperçu** montre la date de
  chaque séance et signale celles **ignorées** quand on démarre en milieu de
  semaine. À la confirmation, les séances sont **copiées dans le planning**.
  - *Exemple* : des séances en J2 et J4, démarrées un **mercredi**, ne placent que
    la séance **J4** la première semaine (J2 = mardi est déjà passé).
- **Indépendance** : une fois placées, les séances vivent leur vie. Modifier ou
  supprimer le programme **ne touche pas** les séances déjà au planning.
- **Repère visuel** : les séances issues d'un programme affichent un badge **▣** et
  l'objectif du bloc (au survol et dans le détail).

---

## 9. Mensuration (poids & mesures)

Le suivi du **poids** et des **mensurations** (tour de taille, bras…) est intégré au
module via la sous-page **Mensuration** du menu Entraînement
(`/entrainement/mensuration`). On y enregistre ses pesées, on suit la **tendance
lissée**, l'**IMC** et un **objectif de poids** avec date estimée.

---

## 10. Bon à savoir

- **Mono-utilisateur**, données stockées en PostgreSQL (voir [`technique.md`](./technique.md)).
- Un jour peut contenir **0, 1 ou plusieurs** séances.
- La liste des **noms d'exercices** déjà saisis se gère aussi dans le
  **Référentiel** (onglet « Exercices de musculation »).
- Le module est accessible via **Entraînement** (`/entrainement`).

---

> Spécification fonctionnelle de référence :
> [`specs/module_entrainement.md`](../../specs/module_entrainement.md).
