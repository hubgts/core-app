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
auto-correction ESLint + Prettier (back & front, **modifie les fichiers**) puis
typecheck backend. La commande doit finir **sans erreur** avant de conclure ;
ce qui reste après l'auto-fix se corrige à la main. Voir
`docs/qualite-du-code.md`.

> ⚠️ **Pas de bind-mount.** Les Dockerfiles font `COPY . .` : le code est figé
> dans l'image au build. Après une modif de code, **reconstruire** l'image
> (`make dc-build` ou `--build`) ; un `make dc-restart` ne suffit pas.

## Arborescence

```
backend/src/<module>/        # *.controller.ts, *.service.ts, types.ts, entities/
backend/src/common/          # helpers partagés (date.util.ts, round.util.ts, reorder.util.ts, text.util.ts)
frontend/src/api/            # un fichier par module + client.js (helper request() partagé)
frontend/src/pages/          # une page par route
frontend/src/components/<module>/
frontend/src/utils/          # date.js, format.js (formatDuration…)
docs/<module>/               # utilisation.md + technique.md
specs/                       # spécifications fonctionnelles de référence
```

## Conventions

- **Cohérence de design et d'usage entre toutes les pages** — priorité absolue.
  L'app doit se comporter et se ressembler d'un module à l'autre : mêmes patterns
  d'interaction pour les mêmes intentions. Avant d'ajouter une UI, **regarde
  comment un cas similaire est déjà résolu ailleurs et réutilise-le** au lieu
  d'inventer une variante. Concrètement : un choix parmi des éléments = une
  **modale** avec `<Combobox>` (jamais un menu déroulant maison ni un
  `promptDialog` numéroté) ; les modales suivent le même gabarit
  (`.modal` / `.field` / `.modal__actions`, bouton principal à droite, `Annuler`
  à sa gauche, `Supprimer` en `danger` à gauche) ; les actions secondaires vont
  dans le `<KebabMenu>` ; confirmations/saisies via `dialogs.jsx`, messages
  éphémères via `toast()`. Une divergence visuelle ou comportementale entre deux
  pages pour une même action est un défaut à corriger, pas un choix local.
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
- **Toast global** : pour un message éphémère de confirmation/erreur, appeler
  `toast('Enregistré.')` de `frontend/src/components/toast.jsx` (impératif,
  comme les dialogues ; `<ToastHost />` est monté une fois dans `main.jsx`, le
  style `.toast` vit dans `index.css`). Ne pas recréer d'état `toast` local
  dans les pages.
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
- **En-tête de page — gabarit unique** : toute page de module suit la même
  structure (réf. Habitudes / Entraînement), avec le CSS partagé `.page-head*`
  d'`index.css` (ne **pas** redéfinir de classe d'en-tête par module) :

  ```jsx
  <header className="page-head">
    <div>
      <h1 className="page-head__title">🎯 Titre</h1>
      <p className="page-head__subtitle">Une phrase courte, orientée action.</p>
    </div>
    <div className="page__headactions">{/* bouton principal + KebabMenu */}</div>
  </header>
  ```

  Le container racine de la page prend **toute la largeur** (`max-width: 100%`,
  sans `margin: 0 auto` ni padding propre : le padding vient de `.content` dans
  `Layout.css`). Les pages de détail (sous-pages avec « ← retour ») gardent leur
  en-tête contextuel mais réutilisent `.page-head` / `.page-head__title`.
- **État vide de page — composant unique** : quand une page/liste principale n'a
  aucune entrée, utiliser `<EmptyState>`
  (`frontend/src/components/EmptyState.jsx`) — rendu plein centré sans bordure
  (CSS `.empty*` partagé dans `index.css`). Props : `icon` (emoji, optionnel),
  `title` (optionnel), `action` (nœud, typiquement le bouton de création),
  `children` (texte descriptif). Ne **pas** recréer de classe `*-empty` par
  module. Les petits états inline (graphe/section/liste sans données, drawer)
  restent des micro-états locaux et ne passent pas par ce composant.
- **Actions secondaires d'une page** (« Gérer les catégories / rayons / types… »
  et autres actions annexes) : ne **jamais** les poser en lien souligné ou bouton
  isolé. Les regrouper dans le menu **`<KebabMenu>`**
  (`frontend/src/components/KebabMenu.jsx`) — bouton ⋮ (trois points verticaux)
  placé en haut à droite de la page, **à droite du bouton principal s'il existe**,
  dans un conteneur `.page__headactions`. Le clic ouvre un dropdown listant les
  actions ; chaque action est `{ icon?, label, to? | onClick? }`.
- Style code : 2 espaces, guillemets simples — imposés par ESLint + Prettier
  (`.prettierrc.json` à la racine, `.eslintrc.cjs` par sous-projet).
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
