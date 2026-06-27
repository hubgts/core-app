# Module Course — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 0.2 · 2026-06-22
> Module **Course** de l'application **Progression / TrackMyself** (module additionnel, hors cadrage MVP initial). Document autoporteur (le module est indépendant), mais **consommateur** de la donnée du module **Alimentation** (recettes).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
> Frontière reprise d'Alimentation : la **génération de listes de courses** appartient à **ce module Course** ; Alimentation **produit la donnée source** (ingrédients chiffrés `{ quantity, unit, label, note }`) et n'expose qu'une amorce d'interface. Voir [`module_alimentation.md`](./module_alimentation.md) §10.
>
> **Changements v0.2 :** (1) toutes les décisions ouvertes de la v0.1 sont **actées** (§9) ; (2) introduction d'un **référentiel d'articles** (titre = nom de l'article + **mesure** par défaut), géré dans la page **Référentiel** : un item de liste désigne désormais un **article** du référentiel. Ce catalogue, initialement prévu en backlog, **remonte au socle** car il fiabilise l'**agrégation** et le **rayon** des items.
>
> **Écart d'implémentation (v0.3, post-spec)** : à la demande, l'implémentation **abandonne le système de statut** `active`/`done`/`archived` (pas d'onglets « En cours / Terminées », pas d'archivage). Une liste = un **titre + une date optionnelle**, affichée sur un **board de cartes** (façon Alimentation / Savoir-faire). La création d'une liste vide passe par une **modale** (titre + date). Le cochage des items reste persisté, mais ne dérive plus aucun statut. Voir [`docs/course/`](../../docs/course/) pour l'état réel du code.
>
> **Note de cadrage** : ce module répond à un besoin précis et concret — **« je ne veux plus rien oublier en faisant les courses »**. Trois leviers : (1) un **référentiel d'articles** (nom + mesure + rayon par défaut) qui structure le vocabulaire ; (2) des **listes types** réutilisables (les essentiels du placard, la liste « semaine », la liste « apéro »…) qu'on instancie au lieu de recommencer ; (3) la **création / l'enrichissement d'une liste depuis une recette** du module Alimentation. Chaque item porte **quantité · mesure · article (désignation)**.

---

## 1. Intention & Philosophie

Le module Course matérialise **l'acte de faire ses courses sans rien oublier**. Il ne
cherche ni à gérer un stock, ni à comparer des prix : il produit, pour une sortie donnée,
**une liste claire, cochable en magasin**, alimentée à partir d'un **référentiel d'articles**
de quatre façons complémentaires :

1. **À la main**, item par item — on choisit un **article** du référentiel (ou on en crée un
   à la volée), puis `quantité? · mesure?`.
2. **Depuis une liste type** — un modèle réutilisable que l'on **instancie** (« nouvelle
   liste à partir du modèle *Semaine* ») au lieu de tout retaper.
3. **Depuis une recette** du module Alimentation — on **envoie les ingrédients** d'une
   recette (mis à l'échelle selon le nombre de portions voulu) vers une liste, soit pour la
   **créer**, soit pour **l'enrichir**.

Trois principes directeurs :

1. **Ne rien oublier prime sur tout.** L'ennemi, c'est l'item manquant. D'où le **référentiel
   d'articles** (un vocabulaire stable, réutilisable), les **listes types** (le filet de
   sécurité des essentiels) et l'**agrégation** : ajouter deux fois « lait » depuis deux
   sources ne crée pas deux lignes mais **fusionne** les quantités.
2. **Cochable en magasin, sans friction.** L'écran de courses est une **checklist** : gros
   items, regroupés par **rayon** (porté par l'article), cocher fait basculer l'item en
   « pris ». Pensé une main, en marchant.
3. **La saisie reste simple.** Un item = **un article** (désignation) `+ quantité? · mesure?`.
   L'article seul suffit ; la mesure et le rayon sont **pré-remplis** par le référentiel.
   Aucune obligation de chiffrer.

Différence clé avec une simple note : la liste **structure** l'item (article/quantité/mesure/
rayon) pour permettre **agrégation**, **regroupement par rayon** et **réemploi** (listes
types), sans imposer cette structure à la saisie rapide.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Article** | Une entrée du **référentiel d'articles** : `{ nom (titre), mesure (unité par défaut), rayon par défaut }`. C'est la **désignation normalisée** de ce qu'on achète (« lait demi-écrémé », « tomates », « papier toilette »). Géré dans la page **Référentiel**, amorcé par un référentiel par défaut, librement enrichi. |
| **Mesure (unité)** | Unité libre courte décrivant comment l'article se compte : `unité` (pièce), `g` (grammage), `kg` (kilogramme), `L` (litre), `mL`, `paquet`, `boîte`, `botte`, `pot`, `sachet`… Portée **par défaut par l'article**, surchargeable sur l'item. |
| **Liste de courses** | Une sortie de courses concrète : un titre, un statut (en cours / terminée / archivée), un ensemble d'**items** cochables. Unité de base du module. |
| **Item (ligne de course)** | Ce qu'il faut acheter, dans une liste : `{ article, quantité?, mesure?, note?, coché }`. Référence **un article** (désignation obligatoire via l'article) ; quantité et mesure optionnelles. |
| **Quantité** | Nombre associé à l'item (ex. `2`, `1.5`, `500`). Optionnelle. Sert à l'agrégation et à l'affichage. |
| **Rayon** | Classement de l'item pour le parcours en magasin (`Fruits & légumes`, `Frais`, `Épicerie`…). Porté **par l'article** (rayon par défaut). Géré par l'utilisateur **dans la page Référentiel**, référentiel par défaut amorcé. |
| **Liste type (modèle)** | Un **gabarit réutilisable** d'items (les essentiels du placard, la liste « semaine », la liste « apéro »…). On l'**instancie** pour créer une vraie liste, ou on **l'applique** à une liste existante. Le modèle n'est jamais « fait » : il sert de source. |
| **Instancier un modèle** | Créer une nouvelle liste **par copie** des items d'un modèle, tous décochés. |
| **Importer une recette** | Ajouter à une liste les **ingrédients chiffrés** d'une recette du module Alimentation, mis à l'échelle selon un nombre de portions cible ; chaque ingrédient est **rapproché d'un article** (créé au besoin). |
| **Agrégation (fusion)** | Lorsqu'on ajoute un item dont **l'article + la mesure** correspond à un item existant, les **quantités se cumulent** au lieu de créer un doublon (RG-07). |
| **Coché / pris** | État par item indiquant qu'il est dans le panier. **Persisté.** |

---

## 3. Périmètre

### Dans le périmètre (v0.2 — ce socle)
- **Référentiel d'articles** (page **Référentiel**) : `nom` + `mesure` (unité par défaut) + `rayon` par défaut. Référentiel par défaut amorcé ; **créer / renommer / changer la mesure / changer le rayon / supprimer**. Création **à la volée** depuis l'ajout d'item et l'import de recette.
- **Créer / éditer / dupliquer / archiver / supprimer** une **liste de courses** : `titre`, `items`.
- **Gérer les items** d'une liste : ajout par **choix d'un article** (autocomplétion) ou **création à la volée**, `quantité? · mesure?` (mesure pré-remplie par l'article), édition, suppression, réordonnancement, **cochage persistant**.
- **Listes types (modèles)** : créer / éditer / dupliquer / supprimer ; **instancier** en nouvelle liste ; **appliquer** à une liste existante (ajout + agrégation).
- **Importer une recette** (module Alimentation) dans une liste : sélection d'une recette, **nombre de portions cible** (mise à l'échelle), prévisualisation, rapprochement des ingrédients vers des **articles**, ajout des items (agrégation). **Nouvelle liste depuis une recette** ou **enrichissement** d'une liste existante.
- **Regroupement par rayon** en magasin (sections cochables) ; **gérer les rayons** dans la page Référentiel (référentiel par défaut amorcé, ordre = parcours magasin).
- **Agrégation** des items de même **article + mesure** (fusion des quantités, RG-07).
- **Recherche / filtre** sur les listes (titre) et au sein d'une liste (article / note).
- **100 % texte**, saisie manuelle, mono-utilisateur.

### Hors périmètre de la v0.2 (autres phases / autres modules — voir §10)
- **Gestion de stock / placard** (savoir ce qu'on a déjà, déduire ce qu'il manque).
- **Prix, budget, total estimé**, lien avec le module **Finances**.
- **Conversion d'unités** automatique (g ↔ kg, mL ↔ L, agrégation cross-mesures) ; à ce socle, l'agrégation n'opère qu'à **mesure identique** (RG-07). La mesure par défaut de l'article réduit déjà fortement les mesures divergentes.
- **Import de plusieurs recettes en un geste** (depuis un meal plan) → phase ultérieure ; au socle, on importe **une recette à la fois**.
- **Planification des repas** → module Alimentation.
- **Partage / liste collaborative en temps réel**, courses multi-foyer.
- **Magasins multiples** / ordre de rayon par enseigne.
- **Dashboard** (agrégation multi-modules).

---

## 4. Modèle de données

### 4.1 `Article` (référentiel d'articles — géré par l'utilisateur)
La **désignation normalisée** réutilisable. Géré dans la page **Référentiel**, amorcé par un
référentiel par défaut, enrichi librement (y compris à la volée depuis une liste / un import).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | **Titre / nom de l'article. Obligatoire**, 1–60 car. (trim), **unique** (insensible casse/accents). |
| `unit` | string \| null | **Mesure par défaut** (`g`, `kg`, `L`, `mL`, `unité`, `paquet`, `boîte`…). Optionnelle ; pré-remplit la mesure de l'item. |
| `aisleId` | UUID \| null | FK → `Aisle` (§4.3) : **rayon par défaut**. Null → « Autre ». |
| `isDefault` | bool | `true` pour les entrées amorcées (éditables/supprimables comme les autres). |
| `position` | int | Ordre d'affichage dans le référentiel. |

> Le besoin exprimé — gérer les **composants d'une liste via le référentiel**, avec un
> **titre (nom de l'article)** et une **mesure** (grammage, kilogramme, litre, unité…) — est
> porté par cette entité : `name` (titre) + `unit` (mesure). Le `aisleId` (rayon par défaut)
> est ajouté pour fiabiliser le regroupement en magasin.

### 4.2 Socle — `ShoppingList` (liste de courses)
L'unité du module. Seul `title` est requis ; une liste peut être vide et s'enrichir.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `title` | string | **Obligatoire**, 1–120 car. (trim). Non unique. |
| `items` | `ShoppingItem[]` | Liste ordonnée (§4.3bis). Peut être vide. |
| `status` | enum | `active` \| `done` \| `archived`. Défaut `active`. `done` = tous items pris / clôturée (RG-09). |
| `position` | int | Ordre manuel dans l'index. |
| `createdAt` / `updatedAt` | datetime | Auto (toute édition de contenu ou de cochage). |

> **Compteurs exposés en lecture** (calculés backend, RG-11) : `itemCount`, `checkedCount`,
> `remainingCount`. Aucun comptage côté front.

### 4.3 `ShoppingItem` (item / ligne de course)
Embarqué dans la liste (ordre = `position`). **Référence un `Article`.**

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré (stable pour le drag & drop et le cochage). |
| `articleId` | UUID | **Obligatoire.** FK → `Article` (§4.1). Porte la **désignation** et, par défaut, mesure et rayon. |
| `quantity` | number \| null | Quantité (optionnelle, ≥ 0). Sert à l'agrégation et à l'affichage. |
| `unit` | string \| null | **Mesure de l'item.** Initialisée depuis `article.unit`, **surchargeable**. Sert de clé d'agrégation avec `articleId`. |
| `note` | string \| null | Précision optionnelle (« bio », « marque X », « mûres »). |
| `checked` | bool | Pris / coché. **Persisté.** Défaut `false`. |
| `sourceRecipeId` | UUID \| null | Traçabilité : recette d'origine si l'item vient d'un import (informatif). |

> Le **rayon** d'un item n'est pas stocké sur l'item : il **provient de l'article**
> (`article.aisleId`). Changer le rayon d'un article repositionne ses items dans toutes les
> listes (RG-08). Le triplet de saisie **quantité · mesure · désignation** se lit
> `quantity · unit · article.name`.

### 4.4 `Aisle` (rayon — géré par l'utilisateur)
Liste de classement amorcée avec un **référentiel par défaut**, puis librement éditable.
**Même mécanique que les types de repas d'Alimentation** (gérée dans la page Référentiel).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | **Obligatoire**, 1–40 car., **unique** (insensible à la casse). |
| `icon` | string \| null | Emoji / nom d'icône (optionnel). |
| `color` | string (token) \| null | Couleur d'accent (optionnel). |
| `isDefault` | bool | `true` pour les entrées amorcées. |
| `position` | int | **Ordre de parcours en magasin** (sections de la liste, sélecteur). |

**Référentiel par défaut (amorçage) :** 🥦 Fruits & légumes · 🧀 Frais · 🥖 Boulangerie ·
🥫 Épicerie salée · 🍫 Épicerie sucrée · 🧊 Surgelés · 🥤 Boissons · 🧼 Hygiène · 🧽 Maison ·
🐾 Animaux · 📦 Autre.

### 4.5 `ShoppingTemplate` (liste type / modèle)
Un gabarit réutilisable. Même forme qu'une liste, **sans cochage ni statut**.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `title` | string | **Obligatoire**, 1–120 car. (trim). Ex. « Semaine », « Essentiels placard », « Apéro ». |
| `items` | `TemplateItem[]` | Items du gabarit : `{ id, articleId, quantity?, unit?, note?, position }`. **Pas de `checked` ni `sourceRecipeId`.** |
| `position` | int | Ordre dans la liste des modèles. |
| `createdAt` / `updatedAt` | datetime | Auto. |

> **Instancier** un modèle copie ses items en `ShoppingItem` (`checked = false`).

---

## 5. Architecture des écrans (UX/UI)

> *Section force de proposition, cohérente avec Alimentation (board de cartes) et le reste
> de l'app (dark-first, hub modulaire).*

### 5.0 Barre de contrôle (commune)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Course                                              [ + Liste ▾ ]   │
│                                                                        │
│   🔍 Rechercher une liste…        [ En cours | Terminées | Modèles ]  │
└──────────────────────────────────────────────────────────────────────┘
```

- **+ Liste ▾** : menu — *Liste vide* · *À partir d'un modèle…* · *À partir d'une recette…*.
- **Onglets** : `En cours` (`active`), `Terminées/Archivées`, `Modèles`. Liens « Gérer les
  rayons » et « Gérer les articles » → page **Référentiel** (§5.6).
- Recherche / onglet **mémorisés** sur la session.

### 5.1 Index des listes (écran d'atterrissage)

Cartes de listes (cohérence visuelle avec le board d'Alimentation), triées par `position`
puis `updatedAt` décroissant.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  EN COURS                                                                  │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐        │
│  │ 🛒 Courses semaine │ │ 🛒 Apéro samedi    │ │ 🛒 Curry dimanche │        │
│  │ 12 / 23 pris       │ │ 0 / 8 pris         │ │ depuis recette     │        │
│  │ ▰▰▰▰▰▱▱▱▱▱         │ │ ▱▱▱▱▱▱▱▱           │ │ 9 items            │        │
│  │              ⋮     │ │              ⋮     │ │              ⋮     │        │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘        │
│                                                                            │
│  MODÈLES                                                                   │
│  ┌───────────────────┐ ┌───────────────────┐                              │
│  │ 📋 Essentiels      │ │ 📋 Apéro           │   [ + Nouveau modèle ]      │
│  │    placard         │ │ 6 items            │                              │
│  │ 18 items           │ │ [Instancier]       │                              │
│  │ [Instancier]       │ │              ⋮     │                              │
│  └───────────────────┘ └───────────────────┘                              │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Carte liste** : titre, **barre de progression** « pris / total », menu ⋮ (renommer,
  dupliquer, *Enregistrer comme modèle*, archiver, supprimer). Clic → détail (§5.2).
- **Carte modèle** : titre, décompte d'items, bouton **Instancier**, menu ⋮.
- **État vide** : « Crée ta première liste — vide, depuis un modèle, ou depuis une recette. »

### 5.2 Détail d'une liste (mode courses)

Vue cochable, **regroupée par rayon** (sections triées par l'ordre de parcours, RG-08).

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 🛒 Courses semaine            12 / 23 pris   [+ Item] [Recette] [⋮] │
│  ▰▰▰▰▰▱▱▱▱▱                                  [ Masquer les pris ]      │
│                                                                        │
│  🥦 Fruits & légumes                                                   │
│   ☐ 1 kg     pommes de terre                                          │
│   ☐ 1 botte  radis                                                    │
│   ☑ 6 unité  tomates                                                  │
│                                                                        │
│  🧀 Frais                                                              │
│   ☐ 2 L      lait demi-écrémé          ◀ (1 L liste + 1 L recette)    │
│   ☑ 1 paquet beurre doux                                             │
│                                                                        │
│  🥫 Épicerie salée                                                     │
│   ☐ 1 boîte  pois chiches                                            │
│   ☐ 500 g    riz basmati                                             │
│                                                                        │
│  📦 Autre                                                              │
│   ☐          piles AA                                                 │
│  ──────────────────────────────────────────────────────────────────  │
│  [ + Article :  🔍 désignation…  │ qté │ mesure ▾ ]  ⏎                │
└──────────────────────────────────────────────────────────────────────┘
```

- **Sections par rayon** (icône + nom), ordonnées par parcours magasin ; items « Autre » en bas.
- **Cocher** un item le marque « pris » (persisté, RG-09) ; option **« Masquer les pris »**.
- **Ajout rapide** en pied : champ **article** avec **autocomplétion sur le référentiel** ;
  sélectionner un article **pré-remplit la mesure** (et fixe le rayon) ; `qté` et `mesure`
  ajustables. Si la saisie ne matche aucun article → **« Créer l'article *…* »** (ajouté au
  référentiel, RG-17). **Entrée** ajoute l'item (agrégation, RG-07), focus conservé.
- **[Recette]** : import depuis une recette (§5.4).
- **Édition d'un item** : quantité, mesure ; pour changer la **désignation** on change
  d'article ; pour changer le **rayon** on édite l'**article** (lien rapide). Note libre.
- **Menu ⋮** : renommer · **Tout décocher** · **Enregistrer comme modèle** · Appliquer un
  modèle… · Vider les pris · Archiver · Supprimer.
- **Réordonnancement manuel** au sein d'un rayon (drag & drop).

### 5.3 Instancier / appliquer un modèle

- **Instancier** : choix du modèle → titre pré-rempli (« {modèle} — {date} ») → nouvelle
  liste, **copie des items** du modèle, tous **décochés** (RG-06).
- **Appliquer à une liste existante** (⋮ → *Appliquer un modèle…*) : ajoute les items du
  modèle, **agrégation** sur article + mesure (RG-07).
- **Enregistrer comme modèle** : crée un `ShoppingTemplate` à partir des items **actuels**
  (cochage ignoré), titre à confirmer (RG-16).

### 5.4 Importer une recette (depuis Alimentation)

Déclenché par **[Recette]** (dans une liste) ou **+ Liste ▾ → À partir d'une recette**.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Importer une recette                                            ✕    │
│                                                                        │
│  🔍 Choisir une recette…           ┌──────────────────────────────┐   │
│                                     │ 🍽️ Curry de pois chiches     │   │
│  Portions :  [ −  4  + ]  (réf. 4)  │ 🍰 Gâteau au yaourt           │   │
│  ( ×1 )                              │ 🫙 Sauce tomate               │   │
│                                     └──────────────────────────────┘   │
│  ──────────────────────────────────────────────────────────────────   │
│  Aperçu (mis à l'échelle) — article rapproché :                       │
│   ☑ 1 boîte   pois chiches      → article existant · Épicerie salée   │
│   ☑ 2 unité   oignons           → article existant · Fruits & légumes │
│   ☑ 400 mL    lait de coco      → ✚ nouvel article · Autre            │
│   ☐ 1 pincée  sel               (sans quantité — décoché par défaut)  │
│                                                                        │
│  Destination :  ( ◉ Liste courante  ○ Nouvelle liste : [______] )     │
│                                            [ Annuler ]  [ Ajouter ]    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Sélection d'une recette** parmi celles d'Alimentation.
- **Portions cible** → **mise à l'échelle** des quantités (règle d'Alimentation, RG-12) ;
  ingrédients **sans quantité** ajoutés tels quels.
- **Rapprochement article** : chaque ingrédient est **matché à un article existant** par nom
  (insensible casse/accents), sinon **création d'un nouvel article** (mesure = unité de
  l'ingrédient, rayon « Autre ») — signalé dans l'aperçu (RG-18).
- **Aperçu éditable** : décocher des ingrédients (« j'ai déjà »), corriger l'article matché.
- **Destination** : **liste courante** (agrégation RG-07) ou **nouvelle liste**.
- **[Ajouter]** insère les items cochés ; `sourceRecipeId` renseigné.

### 5.5 Création / édition d'un modèle

Même formulaire que l'édition d'items d'une liste, **sans cochage ni statut** : titre +
items (`article · qté? · mesure? · note?`), ajout rapide, drag & drop, suppression.
**Annuler / Enregistrer**.

### 5.6 Page Référentiel — onglets « Articles » et « Rayons »

Centralisé dans la page **Référentiel**, aux côtés des autres listes réutilisables (types de
repas d'Alimentation, catégories de Savoir-faire).

**Onglet « Articles »**
- Liste des articles (`nom` · `mesure` · `rayon` · nombre d'items qui l'utilisent),
  recherche, tri par nom / rayon.
- **Créer** : `nom` (unique) + `mesure` (sélecteur d'unités courantes, saisie libre permise)
  + `rayon` (sélecteur). Création aussi **à la volée** depuis l'ajout d'item / l'import.
- **Renommer / changer la mesure / changer le rayon** (y compris articles par défaut).
- **Supprimer** un article : **refusé tant qu'il est utilisé** par des items/modèles
  (message indiquant où), sinon supprimé. *(alternative possible : suppression + items
  orphelins → à trancher, voir §9.)*

**Onglet « Rayons »**
- Liste des rayons (icône + nom + nombre d'articles rattachés), **réordonnables** (drag &
  drop) — **l'ordre = parcours en magasin** (RG-08).
- **Créer** : nom (unique) + **icône**. **Renommer / changer l'icône** (défaut inclus).
- **Supprimer** un rayon : les **articles** rattachés repassent **« Autre »** (jamais
  supprimés) → confirmation rappelant le nombre d'articles impactés (RG-05).

---

## 6. Règles de gestion détaillées

### 6.1 Articles (référentiel)
- **RG-17** — Un article exige un **`name` unique** (insensible casse/accents) ; `unit`
  (mesure) et `aisleId` (rayon) sont optionnels. Création **à la volée** autorisée depuis
  l'ajout d'item et l'import de recette : si le nom saisi n'existe pas, un article est créé.
- **RG-18** — À l'import d'une recette, chaque ingrédient est **rapproché** d'un article par
  `name` (insensible casse/accents) ; à défaut, un **nouvel article** est créé (`unit` =
  unité de l'ingrédient, `aisleId` = « Autre »). L'utilisateur peut corriger le rapprochement
  dans l'aperçu (§5.4).
- **RG-19** — Le **référentiel par défaut** d'articles n'est qu'un amorçage (entrées
  éditables/supprimables). Renommer un article ou changer sa mesure/rayon se **répercute** sur
  l'affichage de tous ses items (la désignation et le rayon viennent de l'article).

### 6.2 Liste & items
- **RG-01** — Une liste exige uniquement un **titre** non vide ; elle peut être vide. Un item
  exige un **`articleId`** valide ; `quantity`, `unit`, `note` sont optionnels.
- **RG-02** — À l'enregistrement, les items **sans `articleId`** sont **supprimés** (saisie
  permissive) ; l'ordre est compacté.
- **RG-03** — `quantity` accepte les décimaux (≥ 0). `unit` (mesure) est un **texte libre
  court**, initialisé depuis `article.unit`, surchargeable ; un sélecteur propose `unité`,
  `g`, `kg`, `L`, `mL`, `paquet`, `boîte`, `botte`, `pot`, `sachet` sans interdire la saisie.

### 6.3 Rayons (gérés par l'utilisateur)
- **RG-04** — Un **article** a au plus un rayon (`aisleId`), ou aucun (→ « Autre »). Les
  rayons sont librement créés / renommés / réordonnés / supprimés. `name` **unique**
  (insensible casse).
- **RG-05** — **Supprimer** un rayon ne supprime **aucun article ni item** : les articles
  concernés repassent **« Autre »** (confirmation indiquant le nombre impacté). Le référentiel
  par défaut n'est qu'un amorçage.

### 6.4 Listes types (modèles)
- **RG-06** — **Instancier** un modèle crée une **nouvelle liste** par **copie figée** de ses
  items (`checked = false`) ; le modèle reste inchangé (pas de lien vivant : aucune synchro
  ultérieure). *[décision actée — §9.3]*
- **RG-16** — **Enregistrer comme modèle** crée un `ShoppingTemplate` à partir des items
  d'une liste, **cochage ignoré**.

### 6.5 Agrégation (fusion d'items)
- **RG-07** — À l'**ajout** d'un item (manuel, modèle, recette), s'il existe déjà un item de
  **même `articleId` ET même `unit`**, les **quantités se cumulent** sur l'item existant (pas
  de doublon). Si l'un des deux a `quantity = null`, on **conserve** la quantité connue. **Pas
  de conversion d'unité** au socle : `unit` différentes → **deux lignes**. Un item **coché**
  qui reçoit un ajout **repasse décoché** (la quantité a changé). *[décision actée — §9.2]*

### 6.6 Affichage & parcours
- **RG-08** — Les items sont **regroupés par rayon** (rayon = `article.aisleId`) ; sections
  ordonnées par la **`position` des rayons** (parcours magasin). Au sein d'un rayon, ordre
  **manuel** (`position` de l'item), à défaut ordre d'ajout.
- **RG-09** — Le **cochage est persisté** *(décision actée — §9.1)*. Une liste passe `done`
  quand **tous** ses items sont cochés (ou clôture manuelle) ; décocher la **rebascule**
  `active`. **Vider les pris** supprime les items cochés.

### 6.7 Recherche
- **RG-10** — Recherche d'index : **titre** des listes/modèles. Dans une liste : **nom de
  l'article** et **note** (insensible casse/accents).

### 6.8 Calculs backend
- **RG-11** — `itemCount`, `checkedCount`, `remainingCount`, complétion (`done`) **calculés
  backend** ; aucune agrégation/comptage côté front.
- **RG-12** — La **mise à l'échelle** à l'import réutilise la règle d'Alimentation
  (`quantity × portions cible / servings` si `servings` connu, sinon **multiplicateur**),
  **arrondie** via `backend/src/common/round.util.ts`. Ingrédients sans quantité inchangés.
  Échelle **figée à l'import** (l'item devient autonome, sans lien vivant à la recette).
  *[import une recette à la fois — décision actée §9.5]*

### 6.9 Cycle de vie
- **RG-13 — Dupliquer** une liste : copie complète des items, cochage **remis à `false`**,
  titre suffixé « (copie) », statut `active`.
- **RG-14 — Archiver** : retire de « En cours » sans rien supprimer (réversible).
- **RG-15 — Supprimer** : suppression définitive → **confirmation explicite**. Idem modèle.

---

## 7. Micro-interactions & Feedback

- **Cochage** : bascule immédiate + progression qui avance ; « Masquer les pris » replie
  l'item avec animation douce.
- **Ajout d'article** : autocomplétion live sur le référentiel ; sélection → mesure et rayon
  pré-remplis ; saisie inédite → action **« Créer l'article *…* »** ; agrégation (RG-07) →
  toast « Fusionné avec *{article}* (total {q} {mesure}) ».
- **Import recette** : aperçu recalculé **en direct** au changement de portions ; badges
  *article existant* / *✚ nouvel article* ; bilan à l'ajout (« 6 items, 2 fusionnés, 1 nouvel
  article »).
- **Instancier un modèle** : transition vers la nouvelle liste, toast « Liste créée depuis
  *{modèle}* ».
- **Édition d'un article au Référentiel** : renommer / changer mesure ou rayon **répercuté
  immédiatement** sur toutes les listes (désignation, section de rayon) — optimistic UI.
- **Réordonner les rayons** : met à jour l'ordre des sections dans toutes les listes.
- **Drag & drop** : poignée ⠿ ; réordonnancement persistant (items au sein d'un rayon,
  modèles, rayons).
- **Confirmations** : suppression de liste/modèle (irréversible) ; suppression de rayon
  (nombre d'articles repassant « Autre ») ; *Vider les pris* (nombre supprimé).

---

## 8. Accessibilité & Responsive

- **Détail liste** : cases = vrais `checkbox` accessibles (état annoncé) ; sections de rayon
  annoncées ; cochage **au clavier** (Espace/Entrée).
- **Autocomplétion d'article** : combobox accessible (rôles ARIA, navigation flèches/Entrée).
- **Couleur non porteuse seule** : rayon porté par **icône + libellé**.
- **Cibles tactiles** : cases, items, poignées ≥ 44 px sur mobile (« une main, en marchant »).
- **Mobile** : index 1–2 colonnes ; détail, import recette, Référentiel en **plein écran** ;
  **clavier numérique** pour la quantité ; gros texte, fort contraste en magasin.
- **Mode magasin** : peu d'interactions fines, grandes zones, « Masquer les pris ».

---

## 9. Cas limites & Décisions actées

**Décisions actées (v0.1 → v0.2, toutes les recommandations adoptées) :**
1. **Cochage persistant** (RG-09) — une liste se construit puis se consomme en plusieurs
   passages.
2. **Agrégation à mesure identique** au socle (RG-07) — la conversion d'unités (g↔kg, mL↔L)
   reste en backlog ; la mesure par défaut de l'article limite déjà les divergences.
3. **Copie figée** modèle → liste (RG-06) — un modèle est une source, pas un parent vivant.
4. **Rayon porté par l'article** (`article.aisleId`, RG-08) — remplace la « déduction » par
   un rayon **explicite et fiable** au niveau du référentiel d'articles.
5. **Import une recette à la fois** (RG-12) — le multi-recettes suivra la planification des
   repas d'Alimentation.

**Cas limites traités :**
- **Liste vide** → valide ; carte « 0 item », état vide invitant à ajouter / importer.
- **Article seul, sans quantité** (« pain », « piles ») → valide ; sans quantité, rayon de
  l'article (ou « Autre »).
- **Article sans rayon** → items regroupés sous « Autre » (en bas).
- **Agrégation même article, mesures différentes** (`500 g` vs `1 kg`) → **deux lignes**
  (pas de conversion au socle, RG-07).
- **Agrégation avec quantité manquante** → pas de doublon, quantité connue conservée.
- **Import d'ingrédients sans quantité** (« sel », « poivre ») → ajoutés tels quels, proposés
  **décochés** dans l'aperçu.
- **Ingrédient sans article correspondant** → **nouvel article** créé à l'import (RG-18).
- **Renommer un article** → tous ses items reflètent le nouveau nom (désignation dérivée).
- **Suppression d'un rayon utilisé** → articles conservés, repassés « Autre » (RG-05).
- **Re-coche après ajout** : item coché recevant un ajout repasse décoché (RG-07).
- **Suppression vs archivage d'une liste** → archivage réversible ; suppression irréversible.

**Question ouverte restante à trancher avec le PO :**
1. **Suppression d'un article utilisé** : **refusée tant qu'il est référencé** (reco, sûr) vs
   suppression autorisée avec items orphelins à nettoyer ? → *Reco : refus si utilisé, avec
   message indiquant les listes/modèles concernés ; on propose plutôt de le renommer.*

---

## 10. Backlog / Évolutions futures

- **Conversion d'unités** (g ↔ kg, mL ↔ L, et g ↔ mL via densité par article) pour agréger
  au-delà de la mesure exacte ; **unités multiples** par article.
- **Enrichissement du référentiel d'articles** : marque/format habituels, **prix indicatif**,
  fréquence d'achat ; suggestions « habituellement acheté ».
- **Import multi-recettes / depuis un meal plan** : générer une liste pour une **période**
  (semaine) à partir de la planification des repas d'Alimentation, agrégation globale.
- **Gestion de placard / stock** : « ce que j'ai déjà » pour ne proposer que le manquant.
- **Budget / prix** : prix par article, **total estimé** de la liste, lien avec **Finances**.
- **Magasins** : ordre de rayon **par enseigne**, listes par magasin.
- **Partage / collaboration** temps réel (foyer).
- **Dashboard** : raccourci « liste en cours », nombre d'items restants.
- **Import** : coller un texte de liste à analyser ; OCR d'un ticket / d'une liste papier.

---

## 11. Critères d'acceptation (récapitulatif testable — v0.2)

- [ ] Je gère un **référentiel d'articles** au Référentiel : chaque article a un **nom
      (titre)**, une **mesure** (g, kg, L, unité…) et un **rayon** par défaut ; je peux en
      créer / renommer / changer la mesure / changer le rayon / supprimer (référentiel par
      défaut amorcé).
- [ ] Je peux **créer une liste** (vide, depuis un modèle, ou depuis une recette) avec un
      **titre seul**, puis l'enrichir d'items.
- [ ] J'**ajoute un item** en choisissant un **article** (autocomplétion) ou en le **créant à
      la volée** ; la **mesure** et le **rayon** sont **pré-remplis** par l'article ; quantité
      et mesure restent ajustables.
- [ ] Les items sont **regroupés par rayon** (rayon de l'article), dans **l'ordre de parcours**
      défini au Référentiel.
- [ ] Le **cochage** est **persisté** ; la liste passe « terminée » quand tout est coché ; je
      peux « Masquer les pris » et « Vider les pris ».
- [ ] L'**agrégation** fusionne les items de **même article + même mesure** (sans conversion),
      sinon crée des lignes distinctes ; un item coché recevant un ajout repasse décoché.
- [ ] Je crée des **listes types** et je les **instancie** (copie figée, décochée) ou les
      **applique** à une liste existante ; je peux **enregistrer une liste comme modèle**.
- [ ] J'**importe une recette** dans une liste **existante** ou **nouvelle**, avec **mise à
      l'échelle** par portions, **rapprochement vers des articles** (création au besoin),
      **aperçu éditable** et **agrégation**.
- [ ] Les **compteurs** et la **mise à l'échelle** sont calculés **côté backend** (aucun
      calcul métier côté front).
- [ ] Je peux **dupliquer** (cochage remis à zéro), **archiver** (réversible) et **supprimer**
      (confirmation) une liste ou un modèle.
- [ ] **Supprimer un rayon** ne supprime aucun article/item (ils repassent « Autre ») ;
      **renommer un article** se répercute sur tous ses items.
