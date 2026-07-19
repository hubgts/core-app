# Module Alimentation — Guide d'utilisation

> Ce document décrit **comment utiliser** le module Alimentation tel qu'il est
> implémenté aujourd'hui. Pour le fonctionnement interne (code, API, données),
> voir [`technique.md`](./technique.md).

---

## 1. À quoi sert ce module ?

Le module Alimentation est ta **bibliothèque de recettes** : on capture une fois
une recette qui marche (un plat, un dessert, une sauce…) pour la **retrouver** et
la **refaire** sans réfléchir. C'est le premier socle d'un module plus large ; à
ce stade il couvre **la gestion des recettes** et **leur réalisation** (cuisiner).

Toute recette répond à la même question — **« Comment je prépare ce plat ? »** —
et se résume à trois blocs : un **résultat** (portions), des **ingrédients**
(ce qu'il faut), des **étapes** (la marche à suivre).

L'affichage est un **mur de cartes façon Google Keep**.

> 🛒 La **génération de listes de courses** n'est **pas** dans ce module : elle
> appartiendra à un futur module **Course**, qui consommera les ingrédients
> chiffrés des recettes.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Recette** | Une préparation : titre, description, ingrédients, étapes, portions, temps. |
| **Type de repas** | Classement d'usage (Entrée, Plat, Dessert…). Un seul par recette. Se gère dans le **Référentiel**. |
| **Label** | Étiquette libre multiple (« végétarien », « rapide »…) pour la recherche/le filtrage. |
| **Ingrédient** | Une ligne de « ce qu'il faut » : quantité (recommandée) + unité + intitulé + note. |
| **Étape** | Une instruction ordonnée de la marche à suivre. |
| **Portions** | Nombre de parts produites (« 4 »). Base de la mise à l'échelle. |
| **Temps** | Préparation, cuisson, repos (en minutes). Le **total** est calculé automatiquement. |
| **Difficulté** | Facile / Moyen / Difficile (optionnel). |
| **Mise à l'échelle** | Recalcule les quantités selon un nombre de portions cible. |
| **Mode Cuisine** | Vue d'exécution : ingrédients et étapes deviennent des cases à cocher. État **éphémère** (rien n'est enregistré). |
| **Épingle** | Remonte une recette en tête du board. |

---

## 3. Le board (écran principal)

Un **mur de cartes** de hauteur variable (masonry). Deux blocs : **📌 Épinglées**
en haut, puis **Autres**.

- En haut : une **barre de recherche** (titre, description, ingrédients, étapes,
  labels), des **filtres par type de repas** (puces) et **par label**. L'action
  **« Gérer les types de repas »** (qui ouvre le Référentiel) est dans le **menu
  d'actions secondaires** (bouton ⋮ en haut à droite, à droite de « + Recette »).
- Chaque **carte** affiche : type de repas (icône), titre, portions · temps total,
  un aperçu des ingrédients (ou le décompte), les labels, et sa **couleur** de fond.
- **Cliquer une carte** ouvre le détail. Le survol révèle l'**épingle** et un menu
  **⋮** (couleur, dupliquer, archiver, supprimer).
- **Réordonner** : glisser-déposer une carte (uniquement quand aucun filtre/recherche
  n'est actif).

---

## 4. Créer et gérer une recette

### Créer
1. Cliquer sur **+ Recette**.
2. Renseigner (seul le **titre** est obligatoire) : description, **type de repas**
   (parmi l'existant), **difficulté**, **labels**, **portions**, **temps** (prép.,
   cuisson, repos), **ingrédients**, **étapes**, **couleur**.
3. **Enregistrer**.

> Les **étapes** s'ajoutent ligne à ligne et se **réordonnent par glisser-déposer**
> (poignée `⠿`). Les lignes laissées vides sont ignorées à l'enregistrement.
>
> Le **temps total** s'affiche automatiquement dès qu'un temps est saisi.

#### Ingrédients (liste d'aliments)
Chaque ligne d'ingrédient (**+ Ingrédient**) se choisit dans la **liste des
aliments** du référentiel (champ déroulant avec recherche), accompagnée d'une
**quantité** et d'une **unité (g / ml)**. Le bouton **`+`** à côté du champ
permet de **créer un aliment à la volée** (nom + macros) sans quitter la recette :
il est aussitôt ajouté à la liste et sélectionné.

> Seuls les ingrédients **liés à un aliment**, **quantifiés** et en **g/ml**
> comptent dans les valeurs nutritionnelles (voir §5).

### Type de repas
Le sélecteur ne propose que les **types existants** (ou « Sans type »).
**On ne crée pas de type depuis ce formulaire** : la gestion se fait dans le
**Référentiel** (voir §8).

### Modifier / dupliquer / archiver / supprimer
- **Éditer** : depuis le détail ou le menu de la carte.
- **Dupliquer** : crée une copie « (copie) », non épinglée — pratique pour une variante.
- **Archiver** : retire la recette du board **sans la supprimer** (réversible).
- **Supprimer** : **irréversible**, une confirmation est demandée (préférer l'archivage).

---

## 5. Le détail d'une recette

Ouvre un **panneau latéral** (off-canvas) :

- En-tête : icône du type de repas, titre, labels, ligne méta (portions · temps
  détaillés · total · difficulté).
- Boutons : **▶ Cuisiner**, **Éditer**, **Dupliquer**, **Archiver**, **Supprimer**.
- **Description**, puis **ingrédients** et **étapes** numérotées.

### Mise à l'échelle des quantités
Si la recette a au moins un ingrédient **chiffré**, un contrôle **`Portions`** (ou
**`×`** si aucune portion de référence n'est définie) apparaît au-dessus des
ingrédients : les boutons **− / +** recalculent les quantités affichées. Les
ingrédients **sans quantité** restent inchangés. C'est **purement de l'affichage** :
la recette n'est pas modifiée, et l'échelle revient à sa valeur de départ à la
réouverture.

### Valeurs nutritionnelles
Dès qu'au moins un ingrédient est **lié à un aliment** et **quantifié en g/ml**,
un tableau **Valeurs nutritionnelles** affiche les **glucides / protéines /
lipides / calories** : pour la quantité affichée (suit la mise à l'échelle) et,
si une portion de référence est définie, **par portion**. Les calories de la
carte du board reprennent la valeur **par portion** (sinon le total).

> Si certains ingrédients ne sont pas comptés (pas d'aliment lié, pas de quantité,
> ou unité autre que g/ml), une mention **« Calcul partiel »** l'indique.

---

## 6. Le Mode Cuisine

Le bouton **▶ Cuisiner** ouvre une **checklist plein écran** pour exécuter la
recette sans perdre sa place :

- Ingrédients et étapes deviennent des **cases à cocher** ; une **barre de
  progression** indique l'avancement, et l'**étape en cours** est mise en évidence.
- Les quantités (et le nombre de portions affiché) reflètent l'**échelle** choisie
  dans le détail.
- L'**écran reste allumé** tant que le mode est ouvert (si le navigateur le permet).
- **Rien n'est enregistré** : c'est une simple aide d'exécution. En quittant
  (**✕** ou **✓ Terminer**), les cases cochées sont oubliées (une confirmation est
  demandée si des cases étaient cochées).

---

## 7. Recherche & filtres

- La **recherche** est instantanée et porte sur le titre, la description, les
  ingrédients, les étapes et les labels (insensible à la casse et aux accents).
- Les **filtres** type de repas et label se **combinent** avec la recherche.
- Sans résultat, un message propose de **réinitialiser les filtres**.

---

## 8. Gérer les types de repas (dans le Référentiel)

Les types de repas se gèrent dans la page **Référentiel**, onglet
**« Types de repas »** (l'action « Gérer les types de repas » du menu ⋮ du board y
mène directement). Un **référentiel par défaut** est fourni (🥗 Entrée, 🍽️ Plat,
🍰 Dessert, 🥐 Petit-déjeuner, 🥂 Apéritif, 🥤 Boisson, 🫙 Base, 📋 Autre), puis
on peut :

- **Créer** un type (nom unique + **icône** au choix) ;
- **Renommer**, **changer l'icône**, **réordonner** (glisser-déposer) ;
- **Supprimer** : les recettes rattachées repassent **« sans type »**, elles ne
  sont **jamais supprimées** (une confirmation rappelle le nombre impacté).

---

## 9. Gérer les aliments (macros & calories)

Les **aliments** (ingrédients du référentiel nutritionnel) se gèrent sur la
sous-page **🥑 Aliments** du module Alimentation : la navigation latérale propose
**Recettes** et **Aliments** une fois dans le module (accès aussi via l'onglet
**« Aliments (macros) »** du Référentiel, ou directement `/alimentation/aliments`).
Cette liste est **indépendante du module Course**.

Pour chaque aliment, on renseigne, **pour 100 g ou 100 ml** :
- les **macronutriments** : glucides, protéines, lipides (en grammes) ;
- la **base** (g ou ml).

Les **calories sont calculées automatiquement** à partir des macros
(`4·glucides + 4·protéines + 9·lipides`) et affichées en direct.

> Un aliment **utilisé dans une recette ne peut pas être supprimé** : il faut
> d'abord le retirer des recettes concernées.

---

## 10. Le Journal (suivi quotidien)

La sous-page **📔 Journal** (`/alimentation/journal`, dans la nav du module) sert
à **suivre ce que tu manges au jour le jour**, avec le **total nutritionnel par
jour**.

- **Vue semaine** (lundi → dimanche). Les flèches ‹ › changent de semaine,
  **Aujourd'hui** revient à la semaine courante ; le jour du jour est mis en avant.
- **Ajouter** (bouton « + Ajouter » sous un jour) : choisir **Recette** (avec un
  nombre de **portions**) ou **Aliment** (avec une **quantité** en g/ml), et une
  **heure** optionnelle. Un aperçu des macros s'affiche pendant la saisie.
- Chaque entrée montre l'heure, le nom, la quantité/les portions et ses calories.
  Cliquer dessus permet de la **modifier** ou de la **supprimer**.
- En pied de chaque jour : **total kcal + glucides / protéines / lipides**.

> Les macros d'une entrée sont **figées au moment de l'ajout** : modifier ou
> supprimer une recette / un aliment plus tard **ne change pas** ce qui est déjà
> inscrit au journal. Ajouter deux fois le même plat crée deux entrées séparées.

---

## 11. Bon à savoir

- **Aucun compte / connexion** : application mono-utilisateur, données stockées
  côté serveur (PostgreSQL — voir [`technique.md`](./technique.md)).
- Le module est accessible via **Alimentation** (`/alimentation`) dans la navigation.

---

> Spécification fonctionnelle de référence :
> [`specs/module_alimentation.md`](../../specs/module_alimentation.md).
