# Module Alimentation — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 0.1 · 2026-06-22
> Module **Alimentation** de l'application **Progression / TrackMyself** (module additionnel, hors cadrage MVP initial). Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
>
> **Note de cadrage** : ce module est un **gros module** voué à couvrir, à terme, tout ce qui concerne l'alimentation (recettes, planification des repas, listes de courses, suivi). **Cette version 0.1 ne spécifie que le premier socle** : **gérer ses recettes** et **les réaliser** (cuisiner). Elle s'inspire directement du module **Savoir-faire** (`objectif + composants + étapes`), spécialisé ici à la cuisine (`recette = ingrédients + étapes`, avec portions, temps de préparation / cuisson / repos, type de repas).
>
> **Frontières assumées** : la **génération de listes de courses** à partir des recettes appartiendra à un **module séparé « Course »**. Le présent module **produit la donnée source** (ingrédients structurés, mise à l'échelle) et expose une **amorce d'interface** (§10) que le module Course consommera ; il **ne gère pas** les courses lui-même.

---

## 1. Intention & Philosophie

Le module Alimentation matérialise le **savoir cuisiner reproductible**. Son but premier
n'est ni de planifier des repas ni de compter des calories, mais de **capturer une fois**
une recette qui marche (« ma sauce tomate », « le gâteau au yaourt », « le curry du
dimanche ») pour la **retrouver** et la **refaire** sans réfléchir — puis, plus tard,
d'alimenter la planification et les courses.

Une *Recette* répond toujours à la même question : **« Comment je prépare ce plat ? »**
Elle se résume à trois blocs :

1. **Un résultat** — ce qu'on obtient (un plat, un nombre de portions).
2. **Des ingrédients** — ce qu'il faut, idéalement chiffrés (pour la mise à l'échelle et,
   demain, les courses).
3. **Des étapes** — la marche à suivre, dans l'ordre.

Trois principes directeurs (hérités de Savoir-faire) :

1. **Capturer vite, retrouver vite.** Créer une recette ne doit rien imposer d'autre qu'un
   **titre** ; tout le reste est optionnel et s'enrichit dans le temps. La recherche et les
   **labels** priment pour retrouver.
2. **La vue prime, façon mur de cartes.** L'écran principal est un **board de cartes**
   (style Google Keep) : on « voit » sa bibliothèque de recettes d'un coup d'œil, on
   épingle ses essentielles, on range par **type de repas** / catégorie.
3. **Une recette sert aussi à exécuter.** L'écran de détail n'est pas qu'un texte à lire :
   un **Mode Cuisine** transforme ingrédients et étapes en **cases à cocher** pour suivre
   l'exécution sans perdre sa place. Cet état est **éphémère** : à ce stade, le module
   **stocke** la recette, il ne tient pas de journal de ce qu'on a cuisiné.

Différence clé avec Savoir-faire : ici le concept est **spécialisé cuisine**. Les
« composants » deviennent des **ingrédients** (toujours pensés pour être **chiffrés**, en
vue des courses), et la recette porte des **métadonnées culinaires** (portions, temps de
préparation / cuisson / repos, type de repas, difficulté).

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Recette** | Une préparation reproductible : `titre`, `description`, `ingrédients`, `étapes`, `portions`, `temps`. Unité de base du module. |
| **Ingrédient** | Une ligne de « ce qu'il faut » : `{ quantité?, unité?, intitulé, note? }`. La quantité est **fortement recommandée** (sert à la mise à l'échelle et au futur module Course), mais reste **optionnelle**. |
| **Étape** | Une instruction ordonnée de la marche à suivre. Texte libre, réordonnable. |
| **Portions** | Nombre de parts que produit la recette (ex. `4`). Base de la **mise à l'échelle**. |
| **Type de repas** | Classifieur d'usage : `entrée` · `plat` · `dessert` · `petit-déjeuner` · `apéritif` · `boisson` · `base` (sauce, pâte…) · `autre`. Sert au tri / filtre / couleur. Liste **gérée par l'utilisateur dans la page Référentiel** (référentiel par défaut amorcé). |
| **Label (tag)** | Étiquette libre multiple (« végétarien », « rapide », « batch cooking », « sans gluten »…). Sert à la recherche et au filtrage transverse. |
| **Temps** | Trois durées indicatives optionnelles : **préparation**, **cuisson**, **repos** (en minutes). Le **temps total** en est la somme (calculé côté backend). |
| **Difficulté** | Repère optionnel : `facile` · `moyen` · `difficile`. |
| **Mise à l'échelle** | Recalcul proportionnel des quantités des ingrédients selon un **nombre de portions cible** (ou un multiplicateur). Disponible si les ingrédients sont chiffrés. |
| **Mode Cuisine** | Vue d'exécution d'une recette : ingrédients et étapes deviennent **cochables**, l'écran reste allumé. État de cochage **éphémère** (non persisté). |
| **Épingle (pin)** | Marque une recette comme prioritaire : elle remonte en tête du board. |
| **Couleur** | Couleur de fond de la carte (palette Keep). Repère visuel libre. |

---

## 3. Périmètre

### Dans le périmètre (v0.1 — ce socle)
- **Créer / éditer / dupliquer / archiver / supprimer** une recette : `titre` (seul obligatoire), `description`, `type de repas`, `labels`, `ingrédients`, `étapes`, `portions`, `temps` (prép / cuisson / repos), `difficulté`, `couleur`.
- **Gérer ses types de repas** (dans la page **Référentiel**) : référentiel par défaut amorcé ; **créer / renommer / changer l'icône / réordonner / supprimer**.
- **Board façon Google Keep** : masonry de cartes, **épinglage**, couleur, aperçu (titre, type de repas, labels, portions · temps total, décompte d'ingrédients/étapes).
- **Recherche plein-texte** (titre, description, ingrédients, étapes, labels) + **filtres** par type de repas et par label.
- **Détail d'une recette** : ingrédients, étapes ordonnées, portions, temps détaillés, difficulté, métadonnées.
- **Mode Cuisine** : ingrédients/étapes cochables, progression visible, écran maintenu allumé ; état **éphémère**, remis à zéro à la sortie.
- **Mise à l'échelle** des quantités via le nombre de portions (si ingrédients chiffrés).
- **Réordonner** ingrédients et étapes (drag & drop) à l'édition.
- **100 % texte**, saisie manuelle.

### Hors périmètre de la v0.1 (autres phases / autres modules — voir §10)
- **Liste de courses** (agrégation des ingrédients de plusieurs recettes) → **module Course** dédié. Le présent module n'expose qu'une **amorce d'interface** (§10).
- **Planification des repas / calendrier** (meal planning) → phase ultérieure du module Alimentation.
- **Référentiel d'ingrédients normalisés** (catalogue réutilisable, rayon, unité par défaut) → phase ultérieure ; au socle, l'ingrédient est **texte libre**.
- **Suivi / journal de ce qui a été cuisiné ou mangé**, **table nutritionnelle** (calories, macros) → phase ultérieure.
- **Photo / illustration** (texte uniquement à ce stade).
- **Dashboard** (agrégation multi-modules).
- **Import depuis une URL** (scraping de sites de recettes) ; **OCR** d'une photo.
- **Partage / export** (PDF, lien public) ; collaboration multi-utilisateurs.
- **Conversion d'unités** automatique (g ↔ ml selon densité) ; **minuteurs** intégrés aux étapes ; **sous-recettes** (recette référencée comme ingrédient d'une autre).

---

## 4. Modèle de données

### 4.1 Socle — `Recette`
L'unité du module. Tous les champs hors `title` sont optionnels : une recette peut n'être
qu'un titre que l'on enrichit plus tard.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `title` | string | **Obligatoire**, 1–120 car. Normalisé (trim). Non nécessairement unique (variantes autorisées). |
| `description` | string \| null | Présentation courte / résultat visé. |
| `mealTypeId` | UUID \| null | FK → `MealType` (§4.4). Null = « sans type ». Sert au tri/filtre/couleur, **pas au formulaire**. |
| `labels` | string[] | Étiquettes libres normalisées (trim), dédoublonnées insensible à la casse. |
| `ingredients` | `Ingredient[]` | Liste ordonnée (§4.2). Peut être vide. |
| `steps` | `Step[]` | Liste ordonnée (§4.3). Peut être vide. |
| `servings` | int \| null | Nombre de portions de référence (ex. `4`). Base de la mise à l'échelle. Null si non renseigné. |
| `prepTimeMin` | int \| null | Temps de préparation (minutes). |
| `cookTimeMin` | int \| null | Temps de cuisson (minutes). |
| `restTimeMin` | int \| null | Temps de repos (minutes). |
| `totalTimeMin` | int \| null | **Calculé** (somme des temps renseignés), exposé en lecture. Null si aucun temps. |
| `difficulty` | enum \| null | `facile` \| `moyen` \| `difficile`. Null si non renseignée. |
| `color` | string (token) \| null | Couleur de carte (palette §5). Null = couleur neutre par défaut. |
| `pinned` | bool | Épinglée. Défaut `false`. |
| `position` | int | Ordre manuel sur le board (au sein du bloc épinglé/non épinglé). |
| `status` | enum | `active` \| `archived`. Défaut `active`. |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto (toute édition de contenu). |

### 4.2 `Ingredient` (ligne d'ingrédient)
Embarqué dans la recette (ordre = `position`).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré (stable pour le drag & drop). |
| `quantity` | number \| null | Quantité (recommandée). Sert à la mise à l'échelle et au futur module Course. |
| `unit` | string \| null | Unité libre courte (`g`, `ml`, `c. à s.`, `pincée`, `gousse`…). |
| `label` | string | **Obligatoire** dans la ligne (intitulé : « farine », « œuf », « oignon »). |
| `note` | string \| null | Précision optionnelle (« émincé », « à température ambiante »). |

> Une ligne **sans quantité** est valide (ex. « sel », « poivre »). On peut grouper
> visuellement via des **lignes de section** (un `Ingredient` à `label` seul utilisé comme
> titre, ex. « — Pour la garniture — ») : convention d'affichage, pas un type distinct à
> ce stade.

### 4.3 `Step` (étape)
Embarquée dans la recette (ordre = `position`).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `text` | string | **Obligatoire**, instruction libre (multi-ligne autorisé). |

### 4.4 `MealType` (type de repas — géré par l'utilisateur)
Liste de classement amorcée avec un **référentiel par défaut**, puis librement éditable.
**Même mécanique que les catégories de Savoir-faire** (gérée dans la page Référentiel).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | **Obligatoire**, 1–40 car., **unique** (insensible à la casse). |
| `icon` | string \| null | Emoji / nom d'icône (optionnel). |
| `color` | string (token) \| null | Couleur d'accent associée (optionnel). |
| `isDefault` | bool | `true` pour les entrées du référentiel amorcé. |
| `position` | int | Ordre d'affichage dans les filtres et le sélecteur. |

**Référentiel par défaut (amorçage) :** 🥗 Entrée · 🍽️ Plat · 🍰 Dessert · 🥐 Petit-déjeuner · 🥂 Apéritif · 🥤 Boisson · 🫙 Base · 📋 Autre.
L'utilisateur peut **en créer, les renommer, changer l'icône, les réordonner et les
supprimer** (y compris celles par défaut). Voir RG-03/04.

---

## 5. Architecture des écrans (UX/UI)

> *Section force de proposition : référence Google Keep (mur de cartes), enrichie d'un
> écran de détail orienté lecture/exécution. Calquée sur Savoir-faire pour la cohérence
> de l'app.*

### 5.0 Barre de contrôle (commune)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Alimentation                                          [ + Recette ] │
│                                                                        │
│   🔍 Rechercher…            [ Tous types ▾ ] 🥗 🍽️ 🍰 🥐 …  ⊞ / ☰    │
│   Labels : ( végé ) ( rapide ) ( batch ) …                            │
└──────────────────────────────────────────────────────────────────────┘
```

- **Recherche plein-texte** (titre + description + ingrédients + étapes + labels), filtrage instantané.
- **Filtre type de repas** (chips dynamiques issues des types de l'utilisateur, multi-sélection) + **filtre labels**. Un lien « Gérer les types de repas » **renvoie vers la page Référentiel** (§5.5).
- **Bascule d'affichage** : `⊞ Grille` (masonry, défaut) / `☰ Liste` (compacte).
- **+ Recette** : ouvre la création (§5.4).
- Recherche / filtres / mode d'affichage **mémorisés** sur la session.

### 5.1 Board (écran d'atterrissage, style Google Keep)

Masonry de cartes de hauteur variable. Bloc **Épinglées** en haut, puis **Autres**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 ÉPINGLÉES                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                    │
│  │ 🍽️ Curry      │ │ 🍰 Gâteau      │ │ 🫙 Sauce      │                    │
│  │    de pois     │ │    au yaourt   │ │    tomate     │                    │
│  │ 4 pers · 45min │ │ 6 pers · 50min │ │ ~1 L · 30 min │                    │
│  │ 9 ingrédients  │ │ • Yaourt…      │ │ 5 ingrédients │                    │
│  │ ( végé )( épicé│ │ • Farine…      │ │ ( base )      │                    │
│  │           📌 ⋮ │ │           📌 ⋮│ │           📌 ⋮│                    │
│  └───────────────┘ └───────────────┘ └───────────────┘                    │
│                                                                            │
│  AUTRES                                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐  │
│  │ 🥗 Taboulé     │ │ 🥐 Pancakes   │ │ 🍽️ Risotto    │ │ 🥤 Smoothie  │  │
│  │ 4 pers         │ │ 12 pièces      │ │ 2 pers · 35min│ │ 2 verres     │  │
│  │ • Semoule…     │ │ • Lait…        │ │ 8 étapes      │ │ ( rapide )   │  │
│  │           📍 ⋮ │ │           📍 ⋮│ │           📍 ⋮│ │          📍 ⋮│  │
│  └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Anatomie d'une carte :**
- **Couleur de fond** = `color` de la recette (repère visuel libre).
- **Tête** : icône de type de repas + **titre**.
- **Méta condensée** : portions · temps total (si renseignés).
- **Aperçu** : soit les **premiers ingrédients/étapes**, soit le **décompte** (« 9 ingrédients », « 8 étapes ») selon ce qui est rempli.
- **Labels** sous forme de chips.
- **Actions au survol / appui long** : 📌 épingler, ⋮ menu (couleur, dupliquer, archiver, supprimer).
- **Clic** → détail (§5.2).

**Comportements :**
- **Drag & drop** des cartes pour l'ordre manuel (au sein de chaque bloc, sans filtre/recherche actif).
- **Épingler** déplace la carte dans le bloc « Épinglées ».
- **État vide** (aucune recette) : illustration + « Ajoute ta première recette : un plat, un dessert, une sauce… » + bouton **+ Recette**.
- **Aucun résultat** de recherche/filtre : message + bouton « Réinitialiser les filtres ».

### 5.2 Détail d'une recette (lecture)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 🍰 Gâteau au yaourt              [▶ Cuisiner] [Éditer] [⋮]         │
│  Dessert · ( facile )( de base )                                      │
│  6 parts · Prép 15 min · Cuisson 35 min · Total 50 min                │
│                                                                        │
│  Le grand classique sans balance : le pot de yaourt sert de mesure.   │
│                                                                        │
│  ── Ingrédients ──                       Portions : [ −  6  + ]        │
│   • 1 pot     yaourt nature                                           │
│   • 3         œufs                                                     │
│   • 3 pots    farine                                                  │
│   • 2 pots    sucre                                                   │
│   • 1 sachet  levure chimique                                         │
│   • ½ pot     huile                                                   │
│                                                                        │
│  ── Étapes ──                                                          │
│   1. Préchauffer le four à 180 °C.                                    │
│   2. Mélanger yaourt, œufs et sucre.                                  │
│   3. Ajouter farine, levure puis huile.                              │
│   4. Verser dans un moule beurré.                                     │
│   5. Cuire 35 min ; vérifier avec la pointe d'un couteau.            │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **En-tête** : icône type de repas, titre, labels ; ligne méta (portions · temps détaillés / total · difficulté).
- **Action principale `▶ Cuisiner`** : ouvre le **Mode Cuisine** (§5.3) — une checklist d'exécution, sans rien enregistrer.
- **Mise à l'échelle** (`Portions : − 6 +`) visible si ingrédients chiffrés et `servings` renseigné ; recalcule les quantités affichées (lecture seule, §6.3).
- **Ingrédients** puis **étapes** ordonnées. Les sections (`— Pour la garniture —`) s'affichent en sous-titres.
- **Menu ⋮** : Dupliquer · Changer la couleur · Archiver · Supprimer.

### 5.3 Mode Cuisine (exécution, éphémère)

But : **suivre** la recette sans perdre sa place. Ingrédients et étapes deviennent
cochables ; l'écran **reste allumé** (wake lock) ; mise en page sobre, gros texte.
**Aucune donnée n'est enregistrée** : c'est une aide d'exécution.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✕  Cuisine · Gâteau au yaourt              6 parts  ▰▰▰▱▱  4/11      │
│                                                                        │
│  Ingrédients                                                           │
│   ☑ 1 pot     yaourt nature                                           │
│   ☑ 3         œufs                                                     │
│   ☑ 3 pots    farine                                                  │
│   ☐ 2 pots    sucre                                                   │
│   ☐ 1 sachet  levure chimique                                         │
│   ☐ ½ pot     huile                                                   │
│                                                                        │
│  Étapes                                                                │
│   ☑ 1. Préchauffer le four à 180 °C.                                  │
│   ☐ 2. Mélanger yaourt, œufs et sucre.   ◀ étape en cours             │
│   ☐ 3. Ajouter farine, levure puis huile.                            │
│   ☐ 4. Verser dans un moule beurré.                                  │
│   ☐ 5. Cuire 35 min.                                                 │
│                                                                        │
│                        [ ✓ Terminer ]                                 │
└──────────────────────────────────────────────────────────────────────┘
```

- **Cases à cocher** sur ingrédients et étapes ; **barre de progression** globale (n/total).
- L'**étape en cours** (première non cochée) est mise en évidence.
- **Nombre de portions** repris du détail (les quantités cochées reflètent l'échelle choisie).
- **Écran maintenu allumé** pendant le mode (wake lock, avec repli silencieux si indisponible).
- **`✓ Terminer`** ou **`✕`** ferme le mode et **abandonne l'état coché** (éphémère, RG-12). Confirmation légère si des cases étaient cochées.

### 5.4 Création / édition (modale ou plein écran)

Déclenché par **+ Recette** (création) ou **Éditer** (édition). Un seul formulaire.

Champs :
- **Titre** (obligatoire, max 120 car.) — focus auto.
- **Description** (texte court, optionnel).
- **Type de repas** (sélecteur listant les types existants ; défaut « sans type »). **La création de type ne se fait pas ici** : un texte d'aide renvoie vers le Référentiel. + **Labels** (saisie avec autocomplétion sur les labels existants).
- **Portions** (entier, optionnel) — base de la mise à l'échelle.
- **Temps** : trois champs en minutes — **préparation**, **cuisson**, **repos** (le total est calculé/affiché automatiquement).
- **Difficulté** (facile / moyen / difficile, optionnelle).
- **Ingrédients** : liste éditable ligne à ligne `quantité? · unité? · intitulé · note?`, **ajout rapide** (Entrée ajoute une ligne), **drag & drop** pour réordonner, suppression par ligne.
- **Étapes** : liste de zones de texte ordonnées, ajout rapide, drag & drop, suppression.
- **Couleur** (palette Keep, 8–10 teintes + neutre).
- (Édition) actions **Archiver** et **Supprimer**.

Boutons : **Annuler** / **Enregistrer**. Validation : titre non vide (seule contrainte
dure). Lignes d'ingrédient/étape **vides ignorées** à l'enregistrement (RG-02).

### 5.5 Gestion des types de repas (page Référentiel)

La gestion des types de repas est **centralisée dans la page Référentiel**, sous un onglet
« Types de repas », aux côtés des autres listes réutilisables (dont les catégories de
savoir-faire). On y accède via le lien « Gérer les types de repas » du board.

- Liste des types (icône + nom + nombre de recettes), **réordonnables** (drag & drop).
- **Créer** : nom (unique) + **icône** (sélecteur d'émoji).
- **Renommer / changer l'icône** d'un type existant (y compris ceux par défaut).
- **Supprimer** un type : les recettes rattachées repassent **« sans type »** (jamais supprimées) → confirmation rappelant le nombre de recettes impactées (RG-04).

---

## 6. Règles de gestion détaillées

### 6.1 Recette & contenu
- **RG-01** — Une recette exige uniquement un **titre** non vide ; tout le reste est optionnel. Les titres **ne sont pas uniques** (variantes assumées).
- **RG-02** — À l'enregistrement, les lignes d'ingrédient **sans `label`** et les étapes **sans `text`** sont **supprimées** (saisie permissive). L'ordre est compacté.
- **RG-17** — `totalTimeMin` est **calculé côté backend** comme la somme des temps renseignés (`prep + cook + rest`) ; null si aucun n'est renseigné. Aucun calcul de temps côté front.

### 6.2 Types de repas (gérés par l'utilisateur)
- **RG-03** — Une recette a **au plus un** type de repas (`mealTypeId`), ou aucun. Le type ne sert qu'au **tri/filtre/couleur** ; le changer n'altère ni les ingrédients ni les étapes.
- **RG-04** — Les types sont **librement créés / renommés / supprimés** par l'utilisateur. Le `name` est **unique** (insensible à la casse). **Supprimer** un type ne supprime **aucune recette** : les recettes concernées repassent **« sans type »** (confirmation indiquant le nombre impacté).
- **RG-05** — Le **référentiel par défaut** n'est qu'un **amorçage** : ces entrées sont éditables et supprimables comme les autres.

### 6.3 Board, recherche, filtres
- **RG-06** — Tri du board : **épinglées d'abord**, puis non épinglées ; au sein de chaque bloc, ordre **manuel** (`position`), à défaut par `updatedAt` décroissant.
- **RG-07** — La **recherche** porte sur `title`, `description`, `ingredients.label`, `steps.text`, `labels` (insensible casse/accents). Les **filtres** type de repas et labels se combinent en **ET** avec la recherche.
- **RG-08** — Les **labels** sont normalisés (trim) et dédoublonnés insensible à la casse au sein d'une recette ; la casse de la première occurrence est conservée. Épingler/désépingler **n'altère pas** `updatedAt`.

### 6.4 Mise à l'échelle
- **RG-09** — Disponible si la recette a au moins un ingrédient **chiffré** (`quantity ≠ null`). Le facteur vient du **nombre de portions cible** rapporté à `servings` (si renseigné), à défaut d'un **multiplicateur** (×0,5 / ×1 / ×2 / ×3…).
- **RG-10** — Quantités affichées = `quantity × facteur`, **arrondies** à une précision lisible (≤ 2 décimales, décimales inutiles supprimées — réutiliser `backend/src/common/round.util.ts`). Les ingrédients **sans quantité** sont **inchangés**.
- **RG-11** — La mise à l'échelle est **purement d'affichage** (lecture seule) : elle ne modifie ni ne persiste les `Ingredient`. Réinitialisée à `servings` (×1) à la réouverture.

### 6.5 Mode Cuisine (état éphémère)
- **RG-12** — L'état de cochage (ingrédients/étapes) est **local et non persisté** : il vit le temps de la session du mode et est **perdu** à la sortie. Il ne crée **aucune** donnée.
- **RG-13** — Le **wake lock** est activé à l'entrée et **relâché** à la sortie ; son indisponibilité est **silencieuse** (pas d'erreur bloquante).

### 6.6 Cycle de vie
- **RG-14 — Dupliquer** : crée une copie complète (ingrédients, étapes, méta, type) avec un titre suffixé « (copie) », **non épinglée**, placée dans « Autres ».
- **RG-15 — Archiver** : retire la recette du board courant **sans rien supprimer** (réversible) ; accessible via un filtre « Archivées ».
- **RG-16 — Supprimer** : suppression définitive de la recette → **confirmation explicite** (« Supprimer "{titre}" ? Action irréversible. »). L'archivage est à privilégier.

---

## 7. Micro-interactions & Feedback

- **Cochage (Mode Cuisine)** : bascule immédiate + barre de progression qui avance ; l'étape « en cours » se déplace automatiquement à la première non cochée.
- **Épingler** : la carte « décolle » vers le bloc Épinglées avec une transition douce ; icône 📌 ↔ 📍.
- **Changer la couleur** : application instantanée sur la carte et le détail (optimistic UI).
- **Mise à l'échelle** : `− / +` recalcule les quantités en direct ; badge des portions cible (`6 parts`) visible ; bouton de réinitialisation.
- **Temps total** : recalculé en direct dans le formulaire dès qu'un des trois temps change.
- **Gestion des types dans le Référentiel** : créer / renommer / changer l'icône met à jour immédiatement les filtres et le sélecteur du formulaire de recette.
- **Ajout rapide** (édition) : Entrée valide la ligne courante et en crée une nouvelle (ingrédients et étapes) ; le focus reste dans la liste.
- **Drag & drop** : poignée ⠿ au survol/mobile ; réordonnancement fluide, persistant (cartes, ingrédients, étapes, types).
- **Recherche** : filtrage live (debounce), surlignage léger des termes trouvés (optionnel).
- **Confirmation de suppression** : recette (irréversible) ; type de repas (rappel du nombre de recettes qui repasseront « sans type »).

---

## 8. Accessibilité & Responsive

- **Board** : structure annoncée (« Épinglées », « Autres ») ; chaque carte est un élément focusable annonçant « {titre}, {type de repas}, {n} ingrédients, {n} étapes{, épinglé} ».
- **Mode Cuisine** : cases à cocher = vrais `checkbox` accessibles (état annoncé) ; progression annoncée (« étape 2 sur 11 ») ; navigation et cochage **au clavier** (Espace/Entrée).
- **Couleur non porteuse seule** : la couleur de carte est décorative ; type de repas porté par **icône + libellé**, labels par **texte**.
- **Cibles tactiles** : cartes, cases à cocher et poignées de drag ≥ 40 px sur mobile ; ≥ 44 px pour les cases du Mode Cuisine (usage « mains occupées »).
- **Mobile** : board en **1–2 colonnes** masonry ; création/édition, gestion des types et Mode Cuisine en **plein écran** ; gros texte et fort contraste en cuisine ; clavier numérique pour quantités/portions/temps.
- **Mode Cuisine** pensé pour la cuisine : peu d'interactions fines, grandes zones cliquables, écran qui ne s'éteint pas.

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités :**
- **Recette « titre seul »** (ni ingrédient ni étape) → valide ; la carte affiche le titre et le type, sans aperçu de contenu.
- **Recette sans type de repas** → autorisée ; affichée sous un libellé neutre, filtrable via « Sans type ».
- **Ingrédients sans quantité** (« sel », « poivre ») → affichés tels quels ; **exclus** de la mise à l'échelle (RG-10).
- **Mise à l'échelle indisponible** (aucun ingrédient chiffré) → contrôle de portions **masqué** (RG-09).
- **Lignes vides** laissées à l'édition → ignorées à l'enregistrement (RG-02).
- **Sortie du Mode Cuisine** → cochage perdu, rien enregistré (RG-12) ; confirmation si des cases étaient cochées.
- **Suppression d'un type utilisé** → recettes conservées, repassées « sans type » (RG-04).
- **Suppression vs archivage d'une recette** → l'archivage préserve la recette ; la suppression est irréversible (RG-15/16).
- **Recherche sans résultat** → message dédié + réinitialisation des filtres.

**Questions ouvertes à trancher avec le PO :**
1. **Type de repas unique** par recette (reco), ou plusieurs ? → *Reco : unique ; les labels couvrent le besoin de classement multiple.*
2. **Mise à l'échelle** par portions cible (reco si `servings` présent) ou multiplicateur ? → *Reco : portions cible si `servings` renseigné, sinon multiplicateur ; masquée si aucun ingrédient chiffré.*
3. **Ingrédient texte libre** au socle (reco) vs **référentiel d'ingrédients normalisés** dès maintenant ? → *Reco : texte libre au socle ; le référentiel normalisé arrive avec/avant le module Course (clé de l'agrégation des courses).*
4. **Sections d'ingrédients** : convention (`— titre —`) au socle, ou vrai type de ligne « section » ? → *Reco : convention au socle.*

---

## 10. Backlog / Évolutions futures (phases suivantes & module Course)

> Ce module est volontairement gros : la v0.1 ne pose que le socle « recettes + cuisiner ».
> Les phases suivantes s'appuient sur la donnée structurée des ingrédients.

- **Module Course (séparé)** — **liste de courses** : agrégation des ingrédients de plusieurs recettes (avec mise à l'échelle), regroupés par intitulé, cochables en magasin. **Interface attendue côté Alimentation** : exposer, par recette, ses ingrédients chiffrés et mis à l'échelle (`{ quantity, unit, label }`) pour que Course les consomme. La normalisation des intitulés / unités est la clé de l'agrégation.
- **Référentiel d'ingrédients normalisés** : catalogue réutilisable (nom canonique, unité par défaut, rayon de magasin) — pré-requis d'une bonne agrégation des courses.
- **Planification des repas** : associer des recettes à des jours/repas (meal planning), vue calendrier ; alimente la génération des courses sur une période.
- **Suivi alimentaire** : journal de ce qui a été cuisiné/mangé ; **table nutritionnelle** (calories, macros par ingrédient/portion).
- **Photo / illustration** : miniature de carte, puis illustration par étape.
- **Import** : depuis une URL (sites de recettes), OCR d'une photo, coller-analyser un texte.
- **Partage / export** : PDF imprimable, lien partageable, export Markdown.
- **Sous-recettes** : référencer une recette comme ingrédient d'une autre (la pâte d'une tarte).
- **Conversion d'unités** (g ↔ ml selon densité) ; **minuteurs** intégrés aux étapes.

---

## 11. Critères d'acceptation (récapitulatif testable — v0.1)

- [ ] Je peux **créer une recette** avec un **titre seul** ; je peux l'enrichir de description, type de repas, labels, ingrédients, étapes, portions, temps (prép/cuisson/repos), difficulté et couleur.
- [ ] Le **temps total** s'affiche, **calculé** à partir des temps renseignés (aucun calcul côté front).
- [ ] Je peux **gérer mes types de repas** : un référentiel par défaut existe, et je peux **créer / renommer / changer l'icône / supprimer** ; supprimer un type **ne supprime aucune recette** (elles repassent « sans type »).
- [ ] Le **board** affiche les recettes en **cartes masonry** façon Google Keep, avec **épinglage**, **couleur** et aperçu (type, portions · temps, labels, décompte/aperçu de contenu).
- [ ] La **recherche plein-texte** (titre, description, ingrédients, étapes, labels) et les **filtres** par type et label fonctionnent et se combinent.
- [ ] Le **détail** affiche ingrédients et étapes **ordonnés** ; je peux **réordonner** ingrédients et étapes en édition (drag & drop, ordre persistant).
- [ ] La **mise à l'échelle** recalcule les quantités chiffrées via le nombre de portions (ingrédients sans quantité inchangés), en **lecture seule**.
- [ ] Le **Mode Cuisine** rend ingrédients et étapes **cochables**, affiche la progression, maintient l'écran allumé, et **n'enregistre rien** (état éphémère).
- [ ] Je peux **dupliquer**, **archiver** (réversible) et **supprimer** (confirmation, irréversible) une recette.
- [ ] Une recette **sans contenu chiffré** masque le contrôle de portions ; les **lignes vides** sont ignorées à l'enregistrement.
- [ ] La **génération de listes de courses** n'est **pas** dans ce module (réservée au module Course) ; le module expose la donnée d'ingrédients nécessaire.
</content>
</invoke>
