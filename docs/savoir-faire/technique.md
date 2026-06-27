# Module Savoir-faire — Documentation technique

> Comment le module fonctionne **côté code**. Pensé pour être compris par un·e
> développeur·euse, même junior. Pour l'usage fonctionnel, voir
> [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Vue d'ensemble

Même architecture que le reste de l'application (trois services Docker Compose) :

| Service | Techno | Port | Rôle |
|---|---|---|---|
| **frontend** | React 18 + Vite | `5173` | Board façon Keep, drawer, mode réalisation. |
| **backend** | NestJS (Node 18, TypeScript) | `3000` | API REST + CRUD savoir-faire / catégories. |
| **db** | PostgreSQL 16 | `5432` (interne) | Persistance. |

Le module Savoir-faire n'a **aucun calcul métier serveur lourd** : le backend fait du
CRUD et quelques normalisations. La **mise à l'échelle** et le **Mode Réalisation**
sont **100 % côté frontend** (affichage / état éphémère, rien n'est persisté).

### Démarrage

```bash
make init       # build des images + démarrage
make dc-logs    # logs en direct
make dc-down    # arrêt
make dc-restart # redémarre SANS rebuild
```

> Comme pour les autres modules : le `Dockerfile` du frontend fait `COPY . .` puis
> `npm run dev` → le code est **figé dans l'image au build**. Après une
> modification, **reconstruire** l'image (`make dc-build`) ; `dc-restart` ne suffit
> pas. Au démarrage, TypeORM crée/maintient les tables (`synchronize: true`).

Au premier démarrage, le service **amorce un référentiel de catégories par défaut**
(voir §5) si la table est vide.

---

## 2. Modèle de données

Trois structures, dans `backend/src/knowhow/entities/`. Les composants, étapes et
labels sont **embarqués en JSON** dans le savoir-faire (listes ordonnées possédées par
lui, toujours chargées avec lui) — pas de tables séparées.

### `KnowHowEntity` → table `knowhow`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `title` | `title` | `varchar(120)` | **Obligatoire**. Non unique (variantes permises). |
| `goal` | `goal` | `text \| null` | Objectif / description. |
| `categoryId` | `category_id` | `uuid \| null` (indexée) | Catégorie, ou `null` = « sans catégorie ». |
| `labels` | `labels` | `jsonb` (`string[]`) | Étiquettes, dédoublonnées (insensible à la casse). |
| `components` | `components` | `jsonb` (`KnowHowComponent[]`) | `{ id, quantity, unit, label, note }`. |
| `steps` | `steps` | `jsonb` (`KnowHowStep[]`) | `{ id, text }`. |
| `yieldText` | `yield_text` | `varchar(80) \| null` | Rendement libre. |
| `yieldBase` | `yield_base` | `double \| null` | Base numérique pour la mise à l'échelle. |
| `totalTimeMin` | `total_time_min` | `int \| null` | Temps total indicatif. |
| `color` | `color` | `varchar(16)` | Couleur de carte (token vide = neutre). |
| `pinned` | `pinned` | `boolean` (défaut `false`) | Épinglé. |
| `position` | `position` | `int` | Ordre manuel sur le board. |
| `status` | `status` | `varchar` | `'active' \| 'archived'`. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |
| `updatedAt` | `updated_at` | `timestamptz` | **Géré manuellement** : seules les éditions de contenu le bumpent (épingler / archiver / réordonner ne le touchent pas). |

### `KnowHowCategoryEntity` → table `knowhow_categories`
| Propriété | Colonne | Type SQL | Détails |
|---|---|---|---|
| `id` | `id` | `uuid` (PK) | Généré. |
| `name` | `name` | `varchar(40)` | Nom affiché. |
| `nameKey` | `name_key` | `varchar(40)` | Nom normalisé, **unique** (`uq_knowhow_categories_name`). |
| `icon` | `icon` | `varchar(16)` | Émoji. |
| `color` | `color` | `varchar(16)` | Couleur d'accent. |
| `isDefault` | `is_default` | `boolean` | `true` pour les entrées amorcées (repère). |
| `position` | `position` | `int` | Ordre d'affichage. |
| `createdAt` | `created_at` | `timestamptz` | Auto. |

**Règles structurelles :**
- `categoryId` est une **FK souple** (pas de contrainte SQL) : à la **suppression
  d'une catégorie**, le service met `category_id = NULL` sur les savoir-faire
  concernés — **aucun savoir-faire n'est supprimé**.
- Les `id` des composants/étapes sont des UUID **(ré)assignés côté serveur** à
  l'enregistrement (stables pour le drag & drop et le cochage du mode réalisation).
- **Normalisation à l'écriture** : titre `trim` (≤ 120) ; labels `trim` + vides
  retirés + dédoublonnés (insensible casse/accents) ; lignes de composant **sans
  `label`** et étapes **sans `text`** **supprimées** ; quantités `< 0`/invalides → `null`.

---

## 3. Persistance (PostgreSQL via TypeORM)

Identique aux autres modules : repositories TypeORM (`KnowHowEntity`,
`KnowHowCategoryEntity`) injectés dans `KnowHowService`, connexion configurée dans
`backend/src/app.module.ts` (entités déclarées explicitement), `synchronize: true`,
données dans le volume Docker `db_data`.

### Amorçage des catégories par défaut
`KnowHowService` implémente `OnModuleInit` : au démarrage, si la table
`knowhow_categories` est **vide**, il insère le référentiel par défaut
(`DEFAULT_CATEGORIES` dans `types.ts` : Cuisine, Maison, Soin, Bricolage, Autre,
avec icône et couleur). Ces entrées sont ensuite **éditables et supprimables**
comme les autres.

```bash
# Inspecter les tables du module
docker exec progression-db psql -U progression -d progression -c "\d knowhow"
docker exec progression-db psql -U progression -d progression -c "SELECT title, labels, jsonb_array_length(components) AS nb_comp FROM knowhow;"
```

---

## 4. API REST

Base URL : `http://localhost:3000`. Contrôleur :
`backend/src/knowhow/knowhow.controller.ts`. Routes préfixées par `/knowhow`.

### Catégories
| Méthode | Route | Body | Rôle |
|---|---|---|---|
| `GET` | `/knowhow/categories` | — | Liste les catégories + `knowhowCount` (savoir-faire actifs par catégorie). |
| `POST` | `/knowhow/categories` | `{ name, icon?, color? }` | Crée (nom unique). |
| `PUT` | `/knowhow/categories/reorder` | `{ ids: string[] }` | Réordonne. |
| `PATCH` | `/knowhow/categories/:id` | `{ name?, icon?, color? }` | Modifie. |
| `DELETE` | `/knowhow/categories/:id` | — | Supprime → savoir-faire rattachés remis à `null`. |

### Savoir-faire
| Méthode | Route | Body / Query | Rôle |
|---|---|---|---|
| `GET` | `/knowhow` | `?includeArchived=true` | Liste (épinglés d'abord, puis `position`, puis `updatedAt` desc). |
| `POST` | `/knowhow` | `KnowHowInput` | Crée. |
| `PUT` | `/knowhow/reorder` | `{ ids: string[] }` | Réordonne (positions = ordre du tableau). |
| `GET` | `/knowhow/:id` | — | Détail. |
| `PATCH` | `/knowhow/:id` | `KnowHowInput` (partiel) | Édite (bumpe `updatedAt`). |
| `POST` | `/knowhow/:id/duplicate` | — | Duplique (« (copie) », non épinglé). |
| `POST` | `/knowhow/:id/pin` · `/unpin` | — | Épingle / désépingle (ne touche pas `updatedAt`). |
| `POST` | `/knowhow/:id/archive` · `/unarchive` | — | Archive / désarchive. |
| `DELETE` | `/knowhow/:id` | — | Supprime le savoir-faire. |

> ⚠️ **Ordre des routes** : `categories` et `reorder` (statiques) sont déclarées
> **avant** `:id` pour ne pas être capturées par la route paramétrée.

### `KnowHowInput` (création / édition)
```ts
{
  title?: string; goal?: string | null; categoryId?: string | null;
  labels?: string[];
  components?: { id?, quantity?, unit?, label?, note? }[];
  steps?: { id?, text? }[];
  yieldText?: string | null; yieldBase?: number | null;
  totalTimeMin?: number | null; color?: string;
}
```

### Validation (renvoie `400` / `409`)
- `title` : non vide, ≤ 120 caractères.
- `categoryId` : doit exister (sinon `400 Catégorie inconnue`).
- Catégorie : `name` non vide ≤ 40 ; **unicité** insensible casse/accents → `409`.

---

## 5. Logique côté frontend (mise à l'échelle, mode réalisation)

Ce qui n'existe **que** côté frontend (rien n'est persisté) :

### Mise à l'échelle (`components/knowhow/constants.js`, `KnowHowDrawer.jsx`)
- Disponible si ≥ 1 composant a une `quantity`.
- Facteur = **multiplicateur** (×0,5 / ×1 / ×2…), ou **portions / `yieldBase`** si
  une base de rendement est renseignée.
- `scaleQuantity(q, f)` = `q × f` arrondi à ≤ 2 décimales ; les composants sans
  quantité sont inchangés. **Lecture seule** : le savoir-faire n'est jamais modifié.

### Mode Réalisation (`components/knowhow/RealizationMode.jsx`)
- État local : un `Set` d'`id` cochés (composants hors sections + étapes).
- Barre de progression `done/total` ; « étape en cours » = première étape non cochée.
- **Wake lock** best-effort via `navigator.wakeLock` (repli **silencieux** si
  indisponible), relâché à la fermeture.
- **Aucune écriture** : quitter abandonne l'état (confirmation si des cases cochées).

### Recherche & filtres (`pages/KnowHowPage.jsx`)
- **Tout est filtré côté client** (volume local-first) : recherche normalisée
  (minuscule, sans accents) sur titre/objectif/composants/étapes/labels ; filtres
  catégorie (multi) et label (multi) combinés en **ET**.
- Le **drag & drop des cartes** est désactivé quand un filtre/recherche est actif
  (évite des positions ambiguës) ; sinon il persiste l'ordre via `PUT /knowhow/reorder`.

---

## 6. Frontend — structure

Arborescence (`frontend/src/`) :

```
api/knowhow.js                       # endpoints savoir-faire + catégories (s'appuie sur api/client.js)
api/client.js                        # helper `request()` fetch partagé
pages/KnowHowPage.jsx / .css         # board, filtres, orchestration des vues
components/knowhow/
  constants.js                       # palette couleurs, icônes, helpers (scale, format)
  KnowHowCard.jsx                    # carte du board (couleur, épingle, menu ⋮)
  KnowHowFormModal.jsx               # modale créer/éditer (composants/étapes drag&drop)
  KnowHowDrawer.jsx                  # détail off-canvas + mise à l'échelle
  RealizationMode.jsx                # checklist plein écran (éphémère, wake lock)
  KnowHowCategoriesPanel.jsx         # gestion des catégories, monté dans la page Référentiel
```

- La gestion des catégories est rendue **dans la page Référentiel**
  (`pages/ReferentialPage.jsx`, onglet `knowhow_category`) via
  `KnowHowCategoriesPanel`, qui appelle l'API catégories de `knowhowApi`. Le board
  y renvoie par un lien `/referentiel?kind=knowhow_category`.
- Le **board** utilise un masonry CSS (`column-count`), bloc épinglés puis autres.
- Les modales réutilisent les classes communes `.modal*`, `.btn*` de `index.css`.

---

## 7. Spécification fonctionnelle de référence

La spec détaillée (intention, règles de gestion `RG-xx`, critères d'acceptation)
vit dans [`specs/module_savoir_faire.md`](../../specs/module_savoir_faire.md). En cas de
doute sur une règle métier, c'est la référence ; ce document-ci décrit l'état
**réel** du code.

---

## 8. Pour aller plus loin (non implémenté)

Ne sont **pas** dans le code actuel : compteur / historique de réalisations,
photos, liste de courses agrégée, planification de repas, import depuis une URL /
OCR, partage / export, conversion d'unités, minuteurs, sous-procédés, recherche
côté serveur (aujourd'hui côté client). Voir le backlog de la spec.
