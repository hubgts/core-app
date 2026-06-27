# Module Course — Documentation technique

> Comment le module fonctionne **côté code**. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md). Pour l'intention et les règles de gestion
> de référence (RG-xx), voir [`specs/module_course.md`](../../specs/module_course.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Vue d'ensemble

Même architecture que le reste de l'application (trois services Docker Compose).
Le module **consomme** la donnée du module Alimentation (recettes) en lecture
seule pour l'import.

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | React 18 + Vite | `5173` | Board de listes (cartes), détail cochable, panneaux Référentiel. |
| **backend** | NestJS (Node 18, TS) | `3000` | API REST : listes, items, modèles, articles, rayons, import recette. |
| **db** | PostgreSQL 16 | `5432` (interne) | Persistance. |

Toute la **logique métier est côté backend** (RG-11) : agrégation des items,
regroupement par rayon, compteurs, mise à l'échelle de l'import. Le frontend ne
fait que de l'affichage, la recherche par titre et la visibilité des items pris.

> Comme les autres modules : `Dockerfile` en `COPY . .` → reconstruire l'image
> après une modif (`make dc-build`). TypeORM `synchronize: true` crée les tables
> au démarrage. Au premier lancement, le service **amorce** rayons + articles par
> défaut si les tables sont vides (`onModuleInit`).

---

## 2. Modèle de données

Quatre entités dans `backend/src/course/entities/`.

### 2.1 `AisleEntity` — `course_aisles` (rayon)
`id`, `name`, `nameKey` (clé d'unicité sans accents), `icon`, `color`,
`isDefault`, `position` (= **ordre de parcours en magasin**, RG-08). Unicité sur
`nameKey`.

### 2.2 `ArticleEntity` — `course_articles` (article du référentiel)
`id`, `name` (**titre**), `nameKey`, `unit` (**mesure par défaut**), `aisleId`
(**rayon par défaut**, FK souple → null si rayon supprimé), `isDefault`,
`position`. Unicité sur `nameKey`. C'est la **désignation normalisée** des items.

### 2.3 `ShoppingListEntity` — `course_lists` (liste de courses)
`id`, `title`, `date` (optionnelle, `YYYY-MM-DD`), `items` (JSONB, voir
ci-dessous), `position`, `createdAt`, `updatedAt`. Pas de notion de statut : une
liste est simplement un board de cartes.

Item embarqué (`ShoppingItem`) : `id`, `articleId` (FK vers l'article),
`quantity`, `unit` (mesure de l'item, initialisée depuis l'article,
surchargeable), `note`, `checked` (**persisté**), `sourceRecipeId` (traçabilité
d'import). Le **rayon** d'un item n'est pas stocké : il provient de l'article.

### 2.4 `ShoppingTemplateEntity` — `course_templates` (liste type)
`id`, `title`, `items` (JSONB de `TemplateItem` = un item **sans** `checked` ni
`sourceRecipeId`), `position`, timestamps.

> Les recettes (`RecipeEntity` du module Alimentation) sont injectées en **lecture
> seule** dans `CourseModule` pour l'import (`TypeOrmModule.forFeature`).

---

## 3. Backend — service & règles

`course.service.ts` porte toute la logique. Points clés :

- **Amorçage** (`onModuleInit`) : `DEFAULT_AISLES` + `DEFAULT_ARTICLES`
  (`types.ts`), articles rattachés à leur rayon par nom.
- **Normalisation des clés** (`normalizeKey`) : sans accents, minuscule, espaces
  compactés → garantit l'unicité insensible casse/accents (rayons & articles).
- **Résolution d'article** (`resolveArticle` / `resolveArticleByName`) : un item
  référence un `articleId` ; si seul un nom est fourni, l'article est **trouvé ou
  créé** à la volée (RG-17). L'import de recette rapproche chaque ingrédient d'un
  article par nom, en crée un au besoin (mesure = unité de l'ingrédient, rayon
  « Autre », RG-18).
- **Agrégation** (`mergeItem`, RG-07) : à l'ajout, si un item de **même
  `articleId` ET même `unit`** existe, les quantités se **cumulent** (item coché
  → redécoché). Mesures différentes → lignes distinctes. **Aucune conversion
  d'unité.**
- **Mise à l'échelle** (`scaleFactor` + `round2`) : `quantity × portions /
  servings` (sinon ×1), arrondi via `common/round.util.ts`. Figée au moment de
  l'import (RG-12).
- **Cochage persisté** : l'état `checked` des items est stocké ; il n'y a **pas**
  de statut de liste dérivé (en cours / terminée). Une liste reste un simple board
  de cartes, avec un titre et une **date** optionnelle.
- **Compteurs** (`listSummary`) : `itemCount`, `checkedCount`, `remainingCount`
  calculés à la lecture (RG-11), pour la barre de progression des cartes.
- **Décoration des items** (`decorateItem`) : à la lecture, chaque item est
  enrichi du nom d'article + rayon (`aisleName`, `aisleIcon`, `aisleOrder`) via
  un contexte indexé (`buildContext`).
- **Tri automatique par rayon** (`byAisleThenLabel`, RG-08) : `listDetail` (et les
  modèles) renvoient les items **déjà triés** selon la `position` du rayon dans le
  référentiel (ordre de parcours), puis par intitulé alphabétique. Réordonner les
  rayons au Référentiel réorganise donc les listes **à la lecture suivante**, sans
  retoucher les listes.
- **Suppression d'un rayon** : ses articles repassent `aisleId = null` (RG-05).
  **Suppression d'un article** : refusée s'il est référencé par une liste ou un
  modèle (`countArticleUsage`).

---

## 4. API REST (`/course`)

> Convention NestJS du projet : routes fixes (`/reorder`, `/from-recipe`…) **avant**
> les routes paramétrées (`/:id`).

### Rayons
`GET /aisles` · `POST /aisles` · `PUT /aisles/reorder` · `PATCH /aisles/:id` ·
`DELETE /aisles/:id`

### Articles
`GET /articles?q=` · `POST /articles` · `PATCH /articles/:id` ·
`DELETE /articles/:id`

### Listes
`GET /lists` · `POST /lists` (`{ title, date? }`) · `PUT /lists/reorder` ·
`POST /lists/from-template/:templateId` · `POST /lists/from-recipe` ·
`GET /lists/:id` · `PATCH /lists/:id` (`{ title?, date? }`) ·
`POST /lists/:id/{duplicate,uncheck-all}` ·
`DELETE /lists/:id/checked` (vider les pris) ·
`POST /lists/:id/save-as-template` ·
`POST /lists/:id/apply-template/:templateId` ·
`POST /lists/:id/import-recipe` · `DELETE /lists/:id`

### Items d'une liste
`POST /lists/:id/items` · `PUT /lists/:id/items/reorder` ·
`POST /lists/:id/items/:itemId/toggle` · `PATCH /lists/:id/items/:itemId` ·
`DELETE /lists/:id/items/:itemId`

### Modèles
`GET /templates` · `POST /templates` · `GET /templates/:id` ·
`PATCH /templates/:id` · `DELETE /templates/:id`

### Import recette
`GET /recipes/:id/preview?servings=N` → aperçu mis à l'échelle avec rapprochement
d'articles (sans rien créer).

---

## 5. Frontend

| Fichier | Rôle |
|---|---|
| `src/api/course.js` | Client API (helper `request()` partagé). |
| `src/pages/CoursePage.jsx` | Board de cartes (façon Alimentation) + section Modèles ; recherche et drag & drop. |
| `src/pages/ShoppingListPage.jsx` | Détail d'une liste : sections par rayon, cochage, barre d'ajout. |
| `src/components/course/ListCard.jsx` | Carte de liste sur le board (réutilise les classes `.alcard`). |
| `src/components/course/CourseListFormModal.jsx` | Modale de création / édition (titre + date), façon modale d'entraînement. |
| `src/components/course/ArticlePicker.jsx` | Autocomplétion d'article + création à la volée. |
| `src/components/course/ImportRecipeModal.jsx` | Sélection recette + portions + aperçu. |
| `src/components/course/AislesPanel.jsx` | Gestion des rayons (page Référentiel). |
| `src/components/course/ArticlesPanel.jsx` | Gestion des articles (page Référentiel). |
| `src/components/course/constants.js` | `COMMON_UNITS`, `groupByAisle`, `formatMeasure`. |
| `src/pages/CoursePage.css` | Styles du module (accent `--m-course`). |

Routage : `/course` et `/course/:id` (`main.jsx`). Entrée de menu dans
`Layout.jsx` (icône 🛒). Les panneaux Articles/Rayons sont montés dans
`ReferentialPage.jsx` (onglets `course_article` / `course_aisle`).

Les items arrivent **déjà triés par rayon** depuis le backend (§3). Le frontend ne
fait que **découper en sections** (en-têtes de rayon) via `groupByAisle`, à partir
des champs `aisleId/aisleName/aisleIcon/aisleOrder` — aucun calcul métier côté
front, juste un regroupement d'affichage qui suit l'ordre reçu.

---

## 6. Limites connues / écarts avec la spec

- **Aperçu d'import non éditable** : on ne peut pas décocher des ingrédients dans
  l'aperçu avant import (tout est importé ; on supprime ensuite si besoin). La
  spec §5.4 prévoit un aperçu éditable — à ajouter.
- **Ordre des items 100 % automatique** : les items sont rangés par rayon (puis
  alphabétiquement). Il n'y a **pas** d'ordre manuel dans l'UI — l'endpoint
  `PUT /lists/:id/items/reorder` subsiste mais le tri par rayon prime.
- **Pas de conversion d'unités** (choix de socle, RG-07) ; agrégation à mesure
  identique uniquement.
