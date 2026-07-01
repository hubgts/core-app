# Module Alimentation — Documentation technique

> Comment le module fonctionne **côté code**. Pensé pour être compris par un·e
> développeur·euse, même junior. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui (premier
> socle : recettes + Mode Cuisine).

---

## 1. Vue d'ensemble

Même architecture que le reste de l'application (trois services Docker Compose).
Le module est largement **calqué sur le module Savoir-faire** (`knowhow`),
spécialisé ici à la cuisine.

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | React 18 + Vite | `5173` | Board façon Keep, drawer, Mode Cuisine. |
| **backend** | NestJS (Node 18, TypeScript) | `3000` | API REST + CRUD recettes / types de repas. |
| **db** | PostgreSQL 16 | `5432` (interne) | Persistance. |

Le module n'a **aucun calcul métier serveur lourd** : le backend fait du CRUD, des
normalisations et le **calcul du temps total** (somme des temps). La **mise à
l'échelle** et le **Mode Cuisine** sont **100 % côté frontend** (affichage / état
éphémère, rien n'est persisté).

### Démarrage

```bash
make init       # build des images + démarrage
make dc-logs    # logs en direct
make dc-down    # arrêt
make dc-restart # redémarre SANS rebuild
```

> Comme pour les autres modules : les `Dockerfile` font `COPY . .` → le code est
> **figé dans l'image au build**. Après une modification, **reconstruire** l'image
> (`make dc-build`) ; `dc-restart` ne suffit pas. Au démarrage, TypeORM
> crée/maintient les tables (`synchronize: true`).

Au premier démarrage, le service **amorce un référentiel de types de repas par
défaut** (voir §3) si la table est vide.

---

## 2. Modèle de données

Deux entités, dans `backend/src/alimentation/entities/`. Les ingrédients, étapes et
labels sont **embarqués en JSON** dans la recette (listes ordonnées possédées par
elle, toujours chargées avec elle) — pas de tables séparées.

### `RecipeEntity` → table `recipes`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `title` | `title` | `varchar(120)` | **Obligatoire**. Non unique (variantes permises). |
| `description` | `description` | `text \| null` | Présentation courte. |
| `mealTypeId` | `meal_type_id` | `uuid \| null` (indexée) | Type de repas, ou `null` = « sans type ». |
| `labels` | `labels` | `jsonb` (`string[]`) | Étiquettes, dédoublonnées (insensible à la casse). |
| `ingredients` | `ingredients` | `jsonb` (`RecipeIngredient[]`) | `{ id, foodId, quantity, unit, label, note }`. `foodId` lie la ligne à un aliment (liste stricte) ; `null` pour les lignes libres / titres de section (legacy compris). |
| `steps` | `steps` | `jsonb` (`RecipeStep[]`) | `{ id, text }`. |
| `servings` | `servings` | `int \| null` | Portions de référence, base de la mise à l'échelle. |
| `prepTimeMin` | `prep_time_min` | `int \| null` | Temps de préparation (min). |
| `cookTimeMin` | `cook_time_min` | `int \| null` | Temps de cuisson (min). |
| `restTimeMin` | `rest_time_min` | `int \| null` | Temps de repos (min). |
| `difficulty` | `difficulty` | `varchar(16) \| null` | `'facile' \| 'moyen' \| 'difficile'`. |
| `color` | `color` | `varchar(16)` | Couleur de carte (token vide = neutre). |
| `pinned` | `pinned` | `boolean` (défaut `false`) | Épinglée. |
| `position` | `position` | `int` | Ordre manuel sur le board. |
| `status` | `status` | `varchar` | `'active' \| 'archived'`. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |
| `updatedAt` | `updated_at` | `timestamptz` | **Géré manuellement** : seules les éditions de contenu le bumpent (épingler / archiver / réordonner ne le touchent pas). |

> **`totalTimeMin` n'est pas une colonne** : il est **calculé à la lecture**
> (somme des temps renseignés, `null` si aucun) et ajouté à la réponse JSON (RG-17).

> **`nutrition` n'est pas une colonne** : l'apport nutritionnel de la recette est
> **calculé à la lecture** à partir des aliments liés (voir §2 `FoodEntity` et le
> calcul ci-dessous) et ajouté à la réponse JSON.

### `FoodEntity` → table `foods`
Référentiel nutritionnel **dissocié du module Course**. Un aliment porte ses
macronutriments **pour 100 g/ml** ; les calories en sont dérivées.

| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(80)` | Nom affiché. |
| `nameKey` | `name_key` | `varchar(80)` | Nom normalisé, **unique** (`uq_foods_name`). |
| `unit` | `unit` | `varchar(2)` (`'g' \| 'ml'`) | Base des macros (pour 100 g ou 100 ml). |
| `carbs` | `carbs` | `numeric(7,2)` | Glucides pour 100 g/ml. |
| `protein` | `protein` | `numeric(7,2)` | Protéines pour 100 g/ml. |
| `fat` | `fat` | `numeric(7,2)` | Lipides pour 100 g/ml. |
| `kcal` | `kcal` | `numeric(7,1)` | Calories pour 100 g/ml, **dérivées des macros au save**. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

> **Calories d'un aliment** (formule d'Atwater simplifiée) :
> `kcal = 4·glucides + 4·protéines + 9·lipides` (pour 100 g/ml). Recalculées à
> chaque création/édition d'aliment ; les macros sont bornées à `[0, 100]`.

> **Nutrition d'une recette** (`computeNutrition`) : pour chaque ingrédient lié à
> un aliment (`foodId`), **quantifié (> 0)** et dont l'**unité ∈ {g, ml}** correspond
> à celle de l'aliment, on agrège `quantité × (macro / 100)`. La réponse expose
> `nutrition = { carbs, protein, fat, kcal, perServing | null, countedCount,
> incompleteCount }` : `perServing` divise le total par `servings` (si > 0) ;
> `incompleteCount` compte les lignes liées/quantifiées **non comptées** (unité
> non massique). Les lignes libres/sections (sans `foodId` ni quantité) sont
> ignorées sans incrémenter `incompleteCount`.

### `MealTypeEntity` → table `meal_types`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(40)` | Nom affiché. |
| `nameKey` | `name_key` | `varchar(40)` | Nom normalisé, **unique** (`uq_meal_types_name`). |
| `icon` | `icon` | `varchar(16)` | Émoji. |
| `color` | `color` | `varchar(16)` | Couleur d'accent. |
| `isDefault` | `is_default` | `boolean` | `true` pour les entrées amorcées (repère). |
| `position` | `position` | `int` | Ordre d'affichage. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

**Règles structurelles :**
- `mealTypeId` est une **FK souple** (pas de contrainte SQL) : à la **suppression
  d'un type**, le service met `meal_type_id = NULL` sur les recettes concernées —
  **aucune recette n'est supprimée**.
- Les `id` des ingrédients/étapes sont des UUID **(ré)assignés côté serveur** à
  l'enregistrement (stables pour le drag & drop et le cochage du Mode Cuisine).
- **Normalisation à l'écriture** : titre `trim` (≤ 120) ; labels `trim` + vides
  retirés + dédoublonnés (insensible casse/accents) ; lignes d'ingrédient **sans
  `label`** et étapes **sans `text`** **supprimées** ; quantités `< 0`/invalides → `null` ;
  temps/portions arrondis à l'entier ; `difficulty` hors énumération → `null`.

---

## 3. Persistance (PostgreSQL via TypeORM)

Repositories TypeORM (`RecipeEntity`, `MealTypeEntity`) injectés dans
`AlimentationService`, connexion configurée dans `backend/src/app.module.ts`
(entités déclarées explicitement), `synchronize: true`, données dans le volume
Docker `db_data`.

### Amorçage des types de repas par défaut
`AlimentationService` implémente `OnModuleInit` : au démarrage, si la table
`meal_types` est **vide**, il insère le référentiel par défaut
(`DEFAULT_MEAL_TYPES` dans `types.ts` : Entrée, Plat, Dessert, Petit-déjeuner,
Apéritif, Boisson, Base, Autre, avec icône et couleur). Ces entrées sont ensuite
**éditables et supprimables** comme les autres.

```bash
# Inspecter les tables du module
docker exec progression-db psql -U progression -d progression -c "\d recipes"
docker exec progression-db psql -U progression -d progression -c "SELECT title, servings, jsonb_array_length(ingredients) AS nb_ing FROM recipes;"
```

### Import d'aliments (`data/foods.json`)
Un jeu d'aliments courants (orienté musculation, macros pour 100 g/ml) vit dans
**`data/foods.json`** à la racine du dépôt. Le script
`backend/src/scripts/import-foods.ts` l'importe dans la table `foods` :

```bash
make import-foods
```

La cible copie le JSON dans le conteneur backend (le dossier `data/` n'est pas
dans l'image) puis lance le script via `ts-node`. L'import est **idempotent /
rejouable** : rapprochement par `nameKey` (nom normalisé) ; aliment **absent →
créé** ; **présent → mis à jour seulement si une macro (ou l'unité) diffère**
(kcal recalculé) ; **identique → laissé intact**. Le script affiche un récap
`créé(s) / mis à jour / inchangé(s)`.

---

## 4. API REST

Base URL : `http://localhost:3000`. Contrôleur :
`backend/src/alimentation/alimentation.controller.ts`. Routes préfixées par
`/alimentation`.

### Types de repas
| Méthode | Route | Body | Rôle |
|---|---|---|---|
| `GET` | `/alimentation/meal-types` | — | Liste les types + `recipeCount` (recettes actives par type). |
| `POST` | `/alimentation/meal-types` | `{ name, icon?, color? }` | Crée (nom unique). |
| `PUT` | `/alimentation/meal-types/reorder` | `{ ids: string[] }` | Réordonne. |
| `PATCH` | `/alimentation/meal-types/:id` | `{ name?, icon?, color? }` | Modifie. |
| `DELETE` | `/alimentation/meal-types/:id` | — | Supprime → recettes rattachées remises à `null`. |

### Aliments (référentiel nutritionnel)
| Méthode | Route | Body | Rôle |
|---|---|---|---|
| `GET` | `/alimentation/foods` | `?q=` | Liste (recherche libre sur le nom, triée A→Z). |
| `POST` | `/alimentation/foods` | `{ name, unit?, carbs?, protein?, fat? }` | Crée (nom unique ; `kcal` dérivé). |
| `PATCH` | `/alimentation/foods/:id` | idem (partiel) | Modifie (`kcal` recalculé). |
| `DELETE` | `/alimentation/foods/:id` | — | Supprime — **refusé (409)** si l'aliment est utilisé dans une recette. |

### Recettes
| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/alimentation/recipes` | `?includeArchived=true` | Liste (épinglées d'abord, puis `position`, puis `updatedAt` desc). |
| `POST` | `/alimentation/recipes` | `RecipeInput` | Crée. |
| `PUT` | `/alimentation/recipes/reorder` | `{ ids: string[] }` | Réordonne (positions = ordre du tableau). |
| `GET` | `/alimentation/recipes/:id` | — | Détail. |
| `PATCH` | `/alimentation/recipes/:id` | `RecipeInput` (partiel) | Édite (bumpe `updatedAt`). |
| `POST` | `/alimentation/recipes/:id/duplicate` | — | Duplique (« (copie) », non épinglée). |
| `POST` | `/alimentation/recipes/:id/pin` · `/unpin` | — | Épingle / désépingle (ne touche pas `updatedAt`). |
| `POST` | `/alimentation/recipes/:id/archive` · `/unarchive` | — | Archive / désarchive. |
| `DELETE` | `/alimentation/recipes/:id` | — | Supprime la recette. |

> ⚠️ **Ordre des routes** : `recipes/reorder` (statique) est déclarée **avant**
> `recipes/:id` pour ne pas être capturée par la route paramétrée.

### `RecipeInput` (création / édition)
```ts
{
  title?: string; description?: string | null; mealTypeId?: string | null;
  labels?: string[];
  ingredients?: { id?, foodId?, quantity?, unit?, label?, note? }[];
  steps?: { id?, text? }[];
  servings?: number | null;
  prepTimeMin?: number | null; cookTimeMin?: number | null; restTimeMin?: number | null;
  difficulty?: 'facile' | 'moyen' | 'difficile' | null;
  color?: string;
}
```

La réponse ajoute `totalTimeMin` (calculé) aux champs ci-dessus.

### Validation (renvoie `400` / `409`)
- `title` : non vide, ≤ 120 caractères.
- `mealTypeId` : doit exister (sinon `400 Type de repas inconnu`).
- Type de repas : `name` non vide ≤ 40 ; **unicité** insensible casse/accents → `409`.

---

## 5. Logique côté frontend (mise à l'échelle, Mode Cuisine)

Ce qui n'existe **que** côté frontend (rien n'est persisté) :

### Mise à l'échelle (`components/alimentation/constants.js`, `RecipeDrawer.jsx`)
- Disponible si ≥ 1 ingrédient a une `quantity`.
- Facteur = **portions cible / `servings`** si une portion de référence est
  renseignée, sinon **multiplicateur** libre (×0,5 / ×1 / ×2…).
- `scaleQuantity(q, f)` = `q × f` arrondi à ≤ 2 décimales ; les ingrédients sans
  quantité sont inchangés. **Lecture seule** : la recette n'est jamais modifiée.

### Mode Cuisine (`components/alimentation/CookMode.jsx`)
- État local : un `Set` d'`id` cochés (ingrédients hors sections + étapes).
- Barre de progression `done/total` ; « étape en cours » = première étape non cochée.
- Le **nombre de portions affiché** et les quantités reflètent l'échelle choisie.
- **Wake lock** best-effort via `navigator.wakeLock` (repli **silencieux** si
  indisponible), relâché à la fermeture.
- **Aucune écriture** : quitter abandonne l'état (confirmation si des cases cochées).

### Recherche & filtres (`pages/AlimentationPage.jsx`)
- **Tout est filtré côté client** : recherche normalisée (minuscule, sans accents)
  sur titre/description/ingrédients/étapes/labels ; filtres type de repas (multi) et
  label (multi) combinés en **ET**.
- Le **drag & drop des cartes** est désactivé quand un filtre/recherche est actif ;
  sinon il persiste l'ordre via `PUT /alimentation/recipes/reorder`.

---

## 6. Frontend — structure

Arborescence (`frontend/src/`) :

```
api/alimentation.js                    # endpoints recettes + types de repas + aliments (s'appuie sur api/client.js)
api/client.js                          # helper `request()` fetch partagé
pages/AlimentationPage.jsx / .css      # board, filtres, orchestration des vues
pages/FoodsPage.jsx / .css             # page dédiée « Aliments » (tableau macros + kcal, modale)
components/alimentation/
  constants.js                         # palette couleurs, icônes, helpers (scale, format durée/portions)
  RecipeCard.jsx                       # carte du board (couleur, épingle, menu ⋮ ; badge kcal/portion)
  RecipeFormModal.jsx                  # modale créer/éditer (Combobox aliments + quick-add, étapes drag&drop)
  RecipeDrawer.jsx                     # détail off-canvas + mise à l'échelle + valeurs nutritionnelles
  CookMode.jsx                         # checklist plein écran (éphémère, wake lock)
  FoodFormModal.jsx                    # modale créer/éditer un aliment (kcal live), réutilisée par le quick-add
  MealTypesPanel.jsx                   # gestion des types de repas, monté dans la page Référentiel
  FoodsPanel.jsx                       # onglet « Aliments » du Référentiel → renvoie vers la page dédiée
```

- La gestion des types de repas est rendue **dans la page Référentiel**
  (`pages/ReferentialPage.jsx`, onglet `meal_type`) via `MealTypesPanel`, qui
  appelle l'API types de repas de `alimentationApi`. Le board y renvoie par un lien
  `/referentiel?kind=meal_type`. Le panneau **réutilise les classes** du panneau
  catégories de savoir-faire (`.ref-*`, `.rcatman__*`).
- Le module **Alimentation a deux sous-pages** déclarées dans la nav latérale
  (`components/Layout.jsx`, `children`) : **Recettes** (`/alimentation`, le board)
  et **Aliments** (`/alimentation/aliments`, `FoodsPage`). L'onglet `food` du
  Référentiel (`FoodsPanel`) renvoie aussi vers la page Aliments. Dans la
  modale de recette, le champ ingrédient est un **`<Combobox>` strict** alimenté
  par la liste d'aliments, avec un bouton **`+`** ouvrant `FoodFormModal` pour
  créer un aliment à la volée (puis le sélectionner). Chaque ligne d'ingrédient
  est donc un aliment quantifié ; les lignes sans `foodId` ne subsistent que pour
  d'éventuelles recettes **legacy** et restent hors calcul.
- Le **board** utilise un masonry CSS (`column-count`), bloc épinglées puis autres ;
  classes préfixées `al*` (`AlimentationPage.css`).
- Les modales réutilisent les classes communes `.modal*`, `.btn*` de `index.css`.

---

## 7. Spécification fonctionnelle de référence

La spec détaillée (intention, règles de gestion `RG-xx`, critères d'acceptation)
vit dans [`specs/module_alimentation.md`](../../specs/module_alimentation.md). En cas
de doute sur une règle métier, c'est la référence ; ce document-ci décrit l'état
**réel** du code.

---

## 8. Pour aller plus loin (non implémenté)

Ne sont **pas** dans le code actuel : liste de courses agrégée (futur module
**Course**), planification des repas / vue calendrier, journal de ce qui a été cuisiné,
photos, import depuis une URL / OCR, partage / export, conversion d'unités,
minuteurs, sous-recettes, recherche côté serveur (aujourd'hui côté client). Voir le
backlog de la spec.
