# Module Course — Guide d'utilisation

> Comment utiliser le module **Course** au quotidien. Pour le fonctionnement
> côté code, voir [`technique.md`](./technique.md). Pour l'intention et les règles
> de gestion de référence, voir [`specs/module_course.md`](../../specs/module_course.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. À quoi sert ce module

Gérer ses **listes de courses** sans rien oublier. Une liste se remplit de trois
façons :

1. **À la main** — on choisit un **article** (autocomplétion sur le référentiel)
   ou on le crée à la volée, puis on précise une **quantité** et une **mesure**.
2. **Depuis une liste type (modèle)** — un gabarit réutilisable (« Essentiels
   placard », « Apéro »…) qui sert **uniquement de base** à la création d'une
   nouvelle liste.
3. **Depuis une recette** du module Alimentation — on importe ses ingrédients,
   mis à l'échelle selon le nombre de portions voulu.

Chaque item porte **quantité · mesure · article** et se range automatiquement par
**rayon** pour suivre ton parcours en magasin.

---

## 2. L'écran d'accueil (`/course`)

Un **board de cartes** (même présentation que les pages Alimentation et
Savoir-faire) : chaque liste est une carte avec son **titre**, sa **date**
(optionnelle) et sa progression « pris / total ». Une recherche filtre les listes
par titre ; les cartes se **réordonnent** par glisser-déposer. En dessous, une
section **Modèles** regroupe les listes types.

Le bouton **+ Liste ▾** propose :

- **Liste vide** — ouvre une **modale** (comme la création d'un entraînement) où
  tu saisis un **titre** et, si tu veux, une **date** ; la liste s'ouvre ensuite.
- **À partir d'une recette…** — ouvre l'import de recette (choix recette +
  portions), puis crée une nouvelle liste.
- **Créer à partir d'un modèle…** — ouvre une **modale** : choisis un modèle dans
  la liste déroulante puis **Créer la liste** ; une nouvelle liste est créée avec
  ses articles (tous décochés) et s'ouvre aussitôt.

Sur chaque carte (menu ⋮) : **Ouvrir**, **Modifier (titre, date)**,
**Dupliquer** (cochage remis à zéro), **Supprimer** (confirmation, irréversible).

---

## 3. Le détail d'une liste (`/course/:id`)

La liste s'affiche **regroupée par rayon**, dans l'ordre de parcours défini au
Référentiel. Pour chaque item : une **case à cocher** (« pris »), la quantité +
mesure, et la désignation.

### Ajouter un article

La barre d'ajout est **flottante en haut** de la liste (elle reste visible même
en scrollant) :

1. **Désignation** — tape le nom ; une liste d'articles correspondants apparaît.
   Choisis-en un (sa mesure se pré-remplit) ou clique **« Créer l'article … »**
   pour l'ajouter au référentiel.
2. **Quantité** et **Mesure** — ajustables (la mesure vient de l'article par
   défaut).
3. **Ajouter** (ou Entrée) — l'item rejoint la liste.

> **Fusion automatique** : si tu ajoutes un article déjà présent **avec la même
> mesure**, les quantités se **cumulent** au lieu de créer un doublon. Mesures
> différentes (`500 g` vs `1 kg`) → deux lignes distinctes.

### Modifier un article de la liste

Survole une ligne et clique le crayon **✎** : la ligne passe en édition avec les
**mêmes champs qu'à l'ajout** (désignation, quantité, mesure). **OK** valide,
**Annuler** referme sans changement. Le **🗑** supprime l'item.

### Cocher en magasin

- Cocher un item le marque **« pris »** (conservé d'une session à l'autre).
- **Masquer les pris** réduit la liste au fil des courses.

### Actions de la liste

- **+ Recette** — importe une recette (voir §5).
- **Appliquer un modèle** — ajoute les items d'un modèle (avec fusion).
- **Enregistrer comme modèle** — crée un modèle à partir des items actuels
  (cochage ignoré).
- **Tout décocher** · **Vider les pris** (supprime les items cochés).
- **Renommer** (clic sur le titre) · **Supprimer**.

---

## 4. Modèles (listes types)

Un **modèle** est un gabarit qui ne se « fait » pas : il sert **uniquement de
base** à la création de listes.

- **Créer une liste à partir d'un modèle** → via le bouton **+ Liste → Créer à
  partir d'un modèle…** (§2), qui ouvre une modale de choix. La nouvelle liste
  reçoit une copie des articles, tous décochés ; le modèle reste inchangé (copie
  figée, pas de synchronisation).
- **Appliquer à une liste existante** → depuis une liste ouverte, **Appliquer un
  modèle** ajoute ses articles (fusion).
- **Modifier un modèle** → bouton **Modifier** sur la carte du modèle : ouvre une
  page d'édition identique à une liste (barre d'ajout flottante, édition et
  suppression d'articles, renommage), mais **sans les cases à cocher** ni les
  actions propres aux listes. On y compose le contenu du modèle article par
  article.
- **Créer un modèle** : section **Modèles → + Nouveau modèle** (on saisit un nom,
  puis on le remplit via **Modifier**), ou depuis une liste via **Enregistrer
  comme modèle**.

---

## 5. Importer une recette

Depuis l'accueil (**+ Liste → À partir d'une recette**) ou depuis une liste
(**+ Recette**) :

1. Choisis une **recette** (celles du module Alimentation).
2. Règle les **portions cible** : les quantités sont **recalculées** (mise à
   l'échelle).
3. L'aperçu indique, par ingrédient, s'il correspond à un **article existant** ou
   s'il créera un **nouvel article**.
4. **Ajouter** : les ingrédients rejoignent la liste (fusion appliquée). Les
   ingrédients sans quantité (sel, poivre…) sont importés tels quels.

---

## 6. Référentiel : articles & rayons

Dans la page **Référentiel** (menu de gauche), deux onglets dédiés (accessibles
aussi via les actions **« Gérer les articles »** et **« Gérer les rayons »** du
**menu d'actions secondaires** ⋮ en haut à droite de la page Course) :

- **Articles (course)** — le catalogue des désignations. Chaque article a un
  **nom**, une **mesure** par défaut et un **rayon** par défaut. Créer / renommer
  / changer la mesure / changer le rayon / supprimer. *(La suppression est
  refusée tant que l'article est utilisé par une liste ou un modèle : renomme-le
  plutôt.)*
- **Rayons (course)** — les sections de magasin. L'**ordre** (glisser-déposer) =
  ton **parcours en magasin**. Supprimer un rayon ne supprime aucun article : ils
  repassent **« Autre »**.

Renommer un article ou changer son rayon se **répercute** sur toutes les listes
qui l'utilisent.
