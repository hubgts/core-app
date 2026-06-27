# Module Savoir-faire — Guide d'utilisation

> Ce document décrit **comment utiliser** le module Savoir-faire tel qu'il est
> implémenté aujourd'hui. Pour le fonctionnement interne (code, API, données),
> voir [`technique.md`](./technique.md).

---

## 1. À quoi sert ce module ?

Le module Savoir-faire est une **bibliothèque personnelle de procédés** au
sens large : recettes de cuisine, fabrications maison (liquide vaisselle, lessive,
cosmétique), ou plus généralement **tout plan d'action reproductible** pour
atteindre un résultat. C'est avant tout un **pense-bête organisé** : on capture une
fois un procédé qui marche, on le retrouve et on le refait sans réfléchir.

Tout savoir-faire répond à la même question — **« Comment j'obtiens ce résultat ? »** —
et se résume à trois blocs : un **objectif**, des **composants** (ce qu'il faut),
des **étapes** (la marche à suivre).

L'affichage est un **mur de cartes façon Google Keep**.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Savoir-faire** | Un procédé reproductible : titre, objectif, composants, étapes. |
| **Catégorie** | Classement d'usage (Cuisine, Maison…). Une seule par savoir-faire. Se gère dans le **Référentiel**. |
| **Label** | Étiquette libre multiple (« vegan », « rapide »…) pour la recherche/le filtrage. |
| **Composant** | Une ligne de « ce qu'il faut » : quantité (optionnelle) + unité + intitulé + note. |
| **Étape** | Une instruction ordonnée de la marche à suivre. |
| **Rendement** | Ce que produit le savoir-faire (« 4 personnes », « ~1 L »). |
| **Mise à l'échelle** | Recalcule les quantités selon un multiplicateur / un nombre de portions. |
| **Mode Réalisation** | Vue d'exécution : composants et étapes deviennent des cases à cocher. État **éphémère** (rien n'est enregistré). |
| **Épingle** | Remonte un savoir-faire en tête du board. |

---

## 3. Le board (écran principal)

Un **mur de cartes** de hauteur variable (masonry). Deux blocs : **📌 Épinglés**
en haut, puis **Autres**.

- En haut : une **barre de recherche** (titre, composants, étapes, labels), des
  **filtres par catégorie** (puces) et **par label**. L'action **« Gérer les
  catégories »** (qui ouvre le Référentiel) est dans le **menu d'actions
  secondaires** (bouton ⋮ en haut à droite, à droite de « + Savoir-faire »).
- Chaque **carte** affiche : catégorie (icône), titre, rendement · temps, un aperçu
  des composants (ou le décompte), les labels, et sa **couleur** de fond.
- **Cliquer une carte** ouvre le détail. Le survol révèle l'**épingle** et un menu
  **⋮** (couleur, dupliquer, archiver, supprimer).
- **Réordonner** : glisser-déposer une carte (uniquement quand aucun filtre/recherche
  n'est actif).

---

## 4. Créer et gérer un savoir-faire

### Créer
1. Cliquer sur **+ Savoir-faire**.
2. Renseigner (seul le **titre** est obligatoire) : objectif, **catégorie**
   (parmi l'existant), **labels**, **rendement** (+ base numérique pour la mise à
   l'échelle), **temps**, **composants**, **étapes**, **couleur**.
3. **Enregistrer**.

> Les **composants** et **étapes** s'ajoutent ligne à ligne (la touche Entrée crée
> une nouvelle ligne) et se **réordonnent par glisser-déposer** (poignée `⠿`). Les
> lignes laissées vides sont ignorées à l'enregistrement.
>
> Astuce : une ligne de composant « — Pour la pâte — » (sans quantité) sert de
> **titre de section**.

### Catégorie
Le sélecteur ne propose que les **catégories existantes** (ou « Sans catégorie »).
**On ne crée pas de catégorie depuis ce formulaire** : la gestion se fait dans le
**Référentiel** (voir §8).

### Modifier / dupliquer / archiver / supprimer
- **Éditer** : depuis le détail ou le menu de la carte.
- **Dupliquer** : crée une copie « (copie) », non épinglée — pratique pour une variante.
- **Archiver** : retire le savoir-faire du board **sans le supprimer** (réversible).
- **Supprimer** : **irréversible**, une confirmation est demandée (préférer l'archivage).

---

## 5. Le détail d'un savoir-faire

Ouvre un **panneau latéral** (off-canvas) :

- En-tête : icône de catégorie, titre, labels, rendement · temps.
- Boutons : **▶ Réaliser**, **Éditer**, **Dupliquer**, **Archiver**, **Supprimer**.
- **Objectif**, puis **composants** et **étapes** numérotées.

### Mise à l'échelle des quantités
Si le savoir-faire a au moins un composant **chiffré**, un contrôle **`Portions`** (ou
**`×`** s'il n'y a pas de base de rendement) apparaît au-dessus des composants :
les boutons **− / +** recalculent les quantités affichées. Les composants **sans
quantité** restent inchangés. C'est **purement de l'affichage** : le savoir-faire n'est
pas modifié, et l'échelle revient à 1 à la réouverture.

---

## 6. Le Mode Réalisation

Le bouton **▶ Réaliser** ouvre une **checklist plein écran** pour exécuter le
savoir-faire sans perdre sa place :

- Composants et étapes deviennent des **cases à cocher** ; une **barre de
  progression** indique l'avancement, et l'**étape en cours** est mise en évidence.
- Les quantités reflètent l'**échelle** choisie dans le détail.
- L'**écran reste allumé** tant que le mode est ouvert (si le navigateur le permet).
- **Rien n'est enregistré** : c'est une simple aide d'exécution. En quittant
  (**✕** ou **✓ Terminer**), les cases cochées sont oubliées (une confirmation est
  demandée si des cases étaient cochées).

---

## 7. Recherche & filtres

- La **recherche** est instantanée et porte sur le titre, l'objectif, les
  composants, les étapes et les labels (insensible à la casse et aux accents).
- Les **filtres** catégorie et label se **combinent** avec la recherche.
- Sans résultat, un message propose de **réinitialiser les filtres**.

---

## 8. Gérer les catégories (dans le Référentiel)

Les catégories de savoir-faire se gèrent dans la page **Référentiel**, onglet
**« Catégories de savoir-faire »** (l'action « Gérer les catégories » du menu ⋮ du
board y mène directement). Un **référentiel par défaut** est fourni (🍳 Cuisine, 🧼 Maison,
🧴 Soin, 🔧 Bricolage, 📋 Autre), puis on peut :

- **Créer** une catégorie (nom unique + **icône** au choix) ;
- **Renommer**, **changer l'icône**, **réordonner** (glisser-déposer) ;
- **Supprimer** : les savoir-faire rattachés repassent **« sans catégorie »**, ils
  ne sont **jamais supprimés** (une confirmation rappelle le nombre impacté).

---

## 9. Bon à savoir

- **Aucun compte / connexion** : application mono-utilisateur, données stockées
  côté serveur (PostgreSQL — voir [`technique.md`](./technique.md)).
- **Pas de compteur de réalisations, pas de photo** : choix assumé du MVP (module
  de stockage, pas de suivi).
- Le module est accessible via **Savoir-faire** (`/savoir-faire`) dans la navigation.

---

> Spécification fonctionnelle de référence :
> [`specs/module_savoir_faire.md`](../../specs/module_savoir_faire.md).
