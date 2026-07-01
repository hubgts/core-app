# Module Habitudes — Guide d'utilisation

> Ce document décrit **comment utiliser** le module Habitudes tel qu'il est
> implémenté aujourd'hui. Pour le fonctionnement interne (code, API, calculs),
> voir [`technique.md`](./technique.md).

---

## 1. À quoi sert ce module ?

Le module Habitudes sert à **suivre sa régularité** sur des routines du quotidien
(méditer, lire, courir…). Le principe : on coche une case chaque jour où l'on
tient l'habitude, et l'application rend visible sa **constance** (séries en cours,
taux de complétion, progression dans le temps).

L'esprit est **« friction zéro »** : cocher = 1 clic, pas de formulaire au
quotidien. On constate, on ne culpabilise pas.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Habitude** | Une routine à suivre (ex. « Méditer »). |
| **Coche (check)** | Marque « habitude tenue » pour un jour donné. Binaire : cochée ou non. |
| **Objectif hebdomadaire** | Nombre de fois par semaine visé (1 à 7). `7` = tous les jours. |
| **Streak (série en cours)** | Régularité consécutive, affichée en **jours** (une série hebdo est convertie en jours × 7 ; au-delà de 30 jours, en mois). |
| **Record** | La plus longue série jamais réalisée. |
| **Taux de complétion** | % des coches réalisées par rapport aux coches attendues sur la période. |
| **Palier** | Seuil de série remarquable (feu d'artifice de félicitations). |

---

## 3. Les deux vues et les deux périodes

En haut de l'écran, deux réglages **indépendants** se combinent :

- **Vue** : `▦ Grille` ou `📈 Graphique`.
- **Période** : `Mois` ou `Année`.

Les flèches `‹ ›` font défiler la période, et **Aujourd'hui** revient à la
période courante.

| | **Mois** | **Année** |
|---|---|---|
| **Grille** | Grille des jours, case par case (l'écran principal). | Heatmap condensée (vue d'ensemble façon « contributions GitHub »). |
| **Graphique** | Courbes de progression sur le mois. | Courbes de progression sur l'année. |

---

## 4. Créer et gérer une habitude

### Créer
1. Cliquer sur **+ Habitude**.
2. Renseigner :
   - **Nom** (obligatoire, max 40 caractères).
   - **Objectif hebdomadaire** : 1 à 7 fois/semaine (par défaut 7 = tous les jours).
   - **Icône** (emoji, optionnel).
   - **Couleur** (optionnel).
3. **Enregistrer**.

> Deux habitudes actives ne peuvent pas porter le même nom (la casse est ignorée).

### Modifier / archiver / supprimer
- **Cliquer sur le nom** d'une habitude (vue Grille — Mois) ouvre la fenêtre d'édition.
- **Archiver** : retire l'habitude des vues, **sans** perdre l'historique (réversible côté données).
- **Supprimer** : efface l'habitude **et toutes ses coches**. Action **irréversible**, une confirmation est demandée.

### Réordonner
Dans la grille mensuelle, **glisser-déposer** une ligne (poignée `⠿`) change son
ordre. L'ordre est conservé partout.

---

## 5. La Grille — Mois (écran principal)

C'est là que l'on coche au quotidien.

- **Colonnes** = jours du mois (numéro + initiale du jour). Les **week-ends** sont
  teintés, le **jour courant** est surligné, et un léger trait sépare les
  **semaines** (chaque lundi).
- **Lignes** = habitudes (icône + nom). Sous le nom apparaît l'objectif s'il est
  inférieur à 7 (ex. `3×/sem`).
- **Cliquer une case** la coche / décoche **instantanément**.

### Indicateurs à droite de chaque ligne
- **Sem.** : un anneau de progression + un compteur `fait/objectif` (ex. `2/3`)
  pour la **semaine en cours**. Quand l'objectif est atteint, l'anneau se ferme
  et affiche un `✓`.
- **🔥** : la série en cours, toujours exprimée en **jours** (ex. `🔥 12j`). Pour
  une habitude à objectif hebdo, la série (comptée en semaines) est convertie en
  jours (× 7). Au-delà de 30 jours, l'affichage bascule en **mois** (ex. `🔥 2m`).

### En bas (pied de grille)
- **Complétion du mois** (%).
- **Meilleure série en cours** (toutes habitudes confondues).

---

## 6. Cocher : règles pratiques

- **C'est permissif** : on peut cocher **n'importe quel jour**, passé **comme
  futur**. Pratique pour rattraper un oubli ou planifier.
- **Période avant la création** d'une habitude : les cases sont **grisées et
  hachurées** (« hors suivi »). Au survol, une infobulle rappelle la date de
  création (« créée le JJ/MM/AAAA — suivi à partir de cette date »). Elles
  restent cliquables, mais **ne comptent pas** dans les pourcentages.
- **Jours futurs** : légèrement atténués, mais cliquables.

> En résumé : la date de création est un **repère visuel** et une **base de
> calcul**, pas une barrière.

---

## 7. La Grille — Année (heatmap)

Une **vue d'ensemble** de l'année : une ligne par habitude, chaque petite case =
un jour, regroupées en mini-calendriers mensuels.

- Case **pleine** (couleur de l'habitude) = jour coché.
- Case **vide** = jour attendu non coché.
- Case **hachurée** = avant la création de l'habitude.
- Case **estompée** = futur.
- À droite : le **% de complétion de l'année** pour l'habitude.
- **Cliquer un mois** ouvre directement la Grille — Mois correspondante (pratique
  pour corriger : on coche en vue Mois, pas dans la heatmap).

---

## 8. Le Graphique (courbes de progression)

Pour visualiser **l'élan dans la durée**.

- Une **courbe par habitude** : le **total cumulé de coches** qui s'accumule.
  La courbe **monte** les jours cochés et **reste plate** les jours non cochés
  (elle ne redescend jamais).
- Une **droite pointillée** « rythme cible » par habitude : la trajectoire idéale
  pour atteindre l'objectif sur la période.
  - Courbe **au-dessus** de la droite = en avance.
  - Courbe **en-dessous** = en retard.
- **Légende** : cliquer sur une habitude **masque/affiche** sa courbe (utile pour
  comparer).
- En vue **Mois**, l'axe horizontal est en jours ; en vue **Année**, en mois.

---

## 9. Félicitations (paliers)

Quand une série atteint un **palier**, un petit message de félicitation apparaît :

- Habitudes **quotidiennes** : à **7, 30, 100, 365** jours.
- Habitudes à **objectif hebdo** : à **4, 12, 26, 52** semaines.

C'est purement motivationnel : aucun score n'est affiché pour le moment.

---

## 10. Bon à savoir

- **Aucun compte / connexion** : l'application est mono-utilisateur. Toutes les
  données sont stockées côté serveur dans une base **PostgreSQL** (voir
  [`technique.md`](./technique.md)).
- **Les modifications sont immédiates** : une coche est enregistrée tout de suite ;
  en cas de souci réseau, l'état revient en arrière avec un message d'erreur.
- L'application s'ouvre directement sur la page **Habitudes** (`/habitudes`).
