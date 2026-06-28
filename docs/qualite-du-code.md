# Qualité du code (lint, format, typage)

Outils d'analyse statique et de formatage du projet, équivalents JS/TS des
outils PHP courants :

| Besoin | PHP | Ici (NestJS / React) |
|---|---|---|
| Analyse statique / typage | PHPStan | **TypeScript strict** (`tsc --noEmit`) — backend uniquement |
| Détection de bugs / mauvaises pratiques | PHPCS / PHPStan | **ESLint** (back + front) |
| Formatage automatique | PHP-CS-Fixer | **Prettier** |

> Le frontend est en **JS/JSX pur** (pas de TypeScript) : pas d'analyse de types
> côté front, mais ESLint + Prettier s'y appliquent.

## Commande (depuis la racine)

```bash
make check   # tout vérifier : typecheck back + ESLint & Prettier (back + front)
```

`make check` est en **lecture seule** (ne modifie aucun fichier) et sort en
erreur si quelque chose ne va pas — parfait pour la CI ou avant un commit.

Pour **corriger** automatiquement, utiliser les scripts npm dans `backend/` ou
`frontend/` :

```bash
npm run lint:fix    # ESLint + corrections auto (dont formatage)
npm run format      # Prettier --write
npm run lint        # ESLint (lecture seule)
npm run format:check
npm run typecheck   # backend uniquement
```

## Configuration

- **Prettier** : `.prettierrc.json` à la racine (partagé back + front).
  2 espaces, guillemets simples, point-virgule, `trailingComma: all`,
  largeur 80. Ignore : `node_modules`, `dist`, `package-lock.json`, `*.md`.
- **ESLint backend** : `backend/.eslintrc.cjs` — `eslint:recommended` +
  `@typescript-eslint/recommended` + Prettier. Niveau « strict mais
  pragmatique » : les vrais bugs sont des **erreurs**, le style des
  **avertissements**. `no-explicit-any` en warning, variables préfixées `_`
  ignorées.
- **ESLint frontend** : `frontend/.eslintrc.cjs` — `eslint:recommended` +
  plugins React / React Hooks / React Refresh + Prettier.
  `react/no-unescaped-entities` est **désactivé** (UI francophone : les
  apostrophes dans le texte JSX sont normales).
- **TypeScript** : `backend/tsconfig.json` est passé en `noImplicitAny: true`
  (en plus de `strictNullChecks`) pour rapprocher le niveau de PHPStan.

## Convention

Avant de conclure une modification, lancer `make quality`. Le code doit rester
**0 erreur** ; les avertissements restants (variables inutilisées, dépendances
de hooks, `console` de démarrage) sont du signal à traiter au cas par cas.
