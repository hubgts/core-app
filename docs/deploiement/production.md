# Déploiement en production (VPS)

La prod est **isolée du dev** : fichier compose, conteneurs, volume et secrets
dédiés. Le dev (`make init`, ports 5173/3000) reste utilisable en parallèle sans
collision.

## Principe

| | Dev | Prod |
|---|---|---|
| Fichier compose | `docker/docker-compose.yml` | `docker/docker-compose.prod.yml` |
| Projet Docker | `core-app` | `core-app-prod` |
| Volume base | `db_data` | `db_data_prod` |
| Backend | `nest start` (TS à la volée) | `node dist/main` (compilé, `Dockerfile.prod`) |
| Frontend | serveur Vite (5173) | build statique servi par **nginx** (`Dockerfile.prod`) |
| API | `http://localhost:3000` (CORS) | `/api` proxifié par nginx → backend (même origine) |
| Entrée publique | port Vite/Nest direct | **Caddy** (80/443, HTTPS auto) → frontend |
| Secrets | en dur dans le compose | `docker/.env.prod` (non versionné) |

Chaîne en prod : **Caddy** (TLS, ports 80/443) → **nginx** (sert le build du
front + reverse-proxe `/api/` vers `backend:3000`, préfixe retiré) → **backend**.
Plus de CORS ni d'URL d'API en dur ; ni la base, ni le backend, ni le frontend ne
sont exposés sur l'hôte — seul Caddy l'est.

## Mise en route

```bash
cp docker/.env.prod.example docker/.env.prod   # puis éditer (mot de passe DB)
make prod-init                                 # build + démarrage
```

Prérequis avant le premier démarrage : le DNS du domaine doit pointer vers le VPS
(enregistrements `A` pour `emiliengantois.fr` et `www`) et les ports **80 et 443**
ouverts sur le pare-feu. Caddy obtient alors le certificat Let's Encrypt au
démarrage ; l'app répond sur `https://emiliengantois.fr`.

### Variables (`docker/.env.prod`)

- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — identifiants PostgreSQL de prod.

Le domaine se configure dans `docker/Caddyfile` (pas dans `.env.prod`).

## Commandes

```bash
make prod-build    # (re)construit les images de prod
make prod-up       # démarre (-d --wait)
make prod-restart  # down + up
make prod-logs     # logs en direct
make prod-ps       # état des conteneurs
make prod-down     # arrêt
make prod-clean    # arrêt + suppression volumes/images (EFFACE LA BASE !)
```

> ⚠️ Comme en dev, pas de bind-mount : après une modif de code, **rebuild**
> (`make prod-build`) — un simple restart ne prend pas le nouveau code.

## TLS / nom de domaine (Caddy)

Le HTTPS est géré par le service **Caddy** (`docker/Caddyfile`), qui obtient et
**renouvelle automatiquement** le certificat Let's Encrypt — aucune commande à
lancer. HTTP (80) est redirigé vers HTTPS (443).

- Changer de domaine : éditer `docker/Caddyfile` puis `make prod-restart`.
- Les certificats sont persistés dans le volume `caddy_data` : **ne pas le
  supprimer** (sinon nouvelle demande à chaque restart → risque de quota
  Let's Encrypt).
- Le DNS doit être propagé **avant** le premier démarrage (vérifier avec
  `dig emiliengantois.fr` → IP du VPS), sinon la validation du certificat échoue.
- Pare-feu : ouvrir `80/tcp` et `443/tcp` (le 80 reste nécessaire pour la
  validation et la redirection).

## Base de données

TypeORM tourne en `synchronize: true` (pas de migrations) : le schéma est
créé/ajusté au démarrage du backend. **À surveiller en prod** dès qu'il y a des
données à préserver — une modif d'entité altère le schéma au redémarrage.
Sauvegardes recommandées via `pg_dump` sur le conteneur `core-app-prod-db`.
