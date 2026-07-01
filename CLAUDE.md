# CLAUDE.md

Guide de travail pour ce dépôt. Lis-le avant toute modification.

## Le projet

**TrackMyself** (alias *Progression*) : tableau de bord personnel mono-utilisateur
de suivi de vie, organisé en **modules indépendants**. Le dashboard est un hub
modulaire ; chaque module a sa page, son entité backend et sa documentation.

Modules actuels : **habitudes**, **entraînement**, **finances**, **savoir-faire**,
**paris sportifs**, **santé**, **référentiel** (+ **dashboard** transversal).

## Stack & architecture

| Couche | Techno | Port |
|---|---|---|
| frontend | React 18 + Vite, React Router (pas de lib UI, SVG « fait main ») | `5173` |
| backend | NestJS (Node 18, TypeScript) + TypeORM | `3000` |
| db | PostgreSQL 16 (non exposé sur l'hôte) | `5432` (interne) |

Le frontend `fetch` l'API ; **aucun calcul métier côté front** (seulement de
l'affichage). Le backend porte la logique (streaks, stats, arrondis…). TypeORM en
`synchronize: true` (pas de migrations) — modifier une entité altère le schéma au
redémarrage.

## Commandes

```bash
make init        # build des images + démarrage (http://localhost:5173 / :3000)
make dc-logs     # logs en direct
make dc-restart  # redémarre SANS rebuild
make dc-down     # arrêt
make dc-clean    # arrêt + suppression volumes/images (efface la base !)
```

Backend hors Docker : `npm run start:dev` (watch). Frontend : `npm run dev`.

**À chaque fin de développement, lancer `make check`** (depuis la racine) :
typecheck backend + ESLint + Prettier (back & front), en lecture seule. Le code
doit rester **0 erreur** avant de conclure. Pour corriger automatiquement :
`npm run lint:fix` / `npm run format` dans `backend/` ou `frontend/`. Voir
`docs/qualite-du-code.md`.

> ⚠️ **Pas de bind-mount.** Les Dockerfiles font `COPY . .` : le code est figé
> dans l'image au build. Après une modif de code, **reconstruire** l'image
> (`make dc-build` ou `--build`) ; un `make dc-restart` ne suffit pas.

## Arborescence

```
backend/src/<module>/        # *.controller.ts, *.service.ts, types.ts, entities/, date.util.ts
backend/src/common/          # helpers partagés (round.util.ts : round1/2/3)
frontend/src/api/            # un fichier par module + client.js (helper request() partagé)
frontend/src/pages/          # une page par route
frontend/src/components/<module>/
frontend/src/utils/          # date.js, format.js (formatDuration…)
docs/<module>/               # utilisation.md + technique.md
specs/                       # spécifications fonctionnelles de référence
```

## Conventions

- **Langue : français** partout (UI, commentaires, messages d'erreur, docs).
- **Réutilise les helpers partagés** plutôt que de redupliquer :
  `api/client.js` (`request()`), `backend/src/common/round.util.ts`,
  `frontend/src/utils/format.js`. Ajoute-les là plutôt que de copier-coller.
- **CSS des modales** : source unique dans `frontend/src/index.css` (classes
  `.modal*`). Ne pas les redéfinir par page.
- **Pas de dialogues natifs** : ne **jamais** utiliser `window.confirm`,
  `window.prompt` ni `window.alert`. Utiliser les boîtes custom de
  `frontend/src/components/dialogs.jsx` :
  `await confirmDialog({ message, danger })` (→ `boolean`),
  `await promptDialog({ title, defaultValue, placeholder })` (→ `string|null`),
  `await alertDialog(message)`. Le `<DialogHost />` est monté une fois dans
  `main.jsx` ; les fonctions sont impératives (pas besoin de hook). Les
  suppressions passent `danger: true`. Rendre le handler `async` au besoin.
- **Pas de `<select>` natif** : utiliser `<Combobox>`
  (`frontend/src/components/Combobox.jsx`) — liste déroulante avec recherche
  intégrée (autocomplete), navigable au clavier. Props : `options` (`[{ value,
  label, disabled? }]`, la `value` est conservée telle quelle et renvoyée brute),
  `value`, `onChange(value)`, `placeholder`, `className` (réutilise les classes de
  champ existantes : `field__input`, `ffield__input`…), `block` (`false` pour un
  rendu en ligne), `searchable` (le champ de recherche n'apparaît qu'au-delà de
  7 options par défaut). L'option « vide » se passe comme une option ordinaire
  (`{ value: '', label: '…' }`).
- **Mobile-first dans le doute** : l'app est très utilisée sur mobile. La nav est
  un tiroir (hamburger) sous 720px (`Layout.jsx`/`.css`) ; les en-têtes de page
  passent à la ligne sous 640px (règle commune dans `index.css`). Toute grille
  multi-colonnes doit retomber en 1 colonne sur petit écran.
- **Couleurs dans les SVG** (graphes, anneaux) : valeur **hex concrète**, jamais
  `var(--…)` (le SVG ne résout pas les variables CSS).
- **Thème sombre d'abord** (dark-first), dashboard = hub modulaire, tokens
  `--m-*` par module.
- **Actions secondaires d'une page** (« Gérer les catégories / rayons / types… »
  et autres actions annexes) : ne **jamais** les poser en lien souligné ou bouton
  isolé. Les regrouper dans le menu **`<KebabMenu>`**
  (`frontend/src/components/KebabMenu.jsx`) — bouton ⋮ (trois points verticaux)
  placé en haut à droite de la page, **à droite du bouton principal s'il existe**,
  dans un conteneur `.page__headactions`. Le clic ouvre un dropdown listant les
  actions ; chaque action est `{ icon?, label, to? | onClick? }`.
- Style code : 2 espaces, guillemets simples, pas d'ESLint/Prettier configuré —
  aligne-toi sur le code existant.
- Ordre des routes NestJS : les routes fixes (`/reorder`) avant les paramétrées
  (`/:id`).

## 📚 Règle de documentation — OBLIGATOIRE

La doc vit dans **`docs/<module>/`**, deux fichiers par module :
- `utilisation.md` — usage fonctionnel ;
- `technique.md` — fonctionnement **côté code** (modèle de données, API, calculs,
  structure frontend).

**À chaque modification du code, mets à jour la doc `/docs` correspondante dans le
même changement.** Concrètement :
- nouveau module → crée `docs/<module>/utilisation.md` et `technique.md` sur le
  même modèle que les modules existants ;
- changement d'API, d'entité, de règle de calcul ou de structure → reflète-le dans
  le `technique.md` du module ;
- changement de comportement visible → mets à jour `utilisation.md` ;
- renommage de fonction/fichier cité dans la doc → corrige la référence.

La doc ne décrit **que ce qui est implémenté** aujourd'hui. La spec fonctionnelle
de référence est dans `specs/` (intention et règles de gestion) ; en cas de doute
métier, c'est elle qui fait foi — `docs/` décrit l'état réel du code.
