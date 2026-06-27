# Déploiement en production (VPS)

La prod est **isolée du dev** : fichier compose, conteneurs, volume et secrets
dédiés. Le dev (`make init`, ports 5173/3000) reste utilisable en parallèle sans
collision.

## Principe

| | Dev | Prod |
|---|---|---|
| Fichier compose | `docker/docker-compose.yml` | `docker/docker-compose.prod.yml` |
| Projet Docker | `docker` (défaut) | `progression-prod` |
| Volume base | `db_data` | `db_data_prod` |
| Backend | `nest start` (TS à la volée) | `node dist/main` (compilé, `Dockerfile.prod`) |
| Frontend | serveur Vite (5173) | build statique servi par **nginx** (`Dockerfile.prod`) |
| API | `http://localhost:3000` (CORS) | `/api` proxifié par nginx → backend (même origine) |
| Secrets | en dur dans le compose | `docker/.env.prod` (non versionné) |

nginx sert le build du front **et** reverse-proxe `/api/` vers `backend:3000`
(préfixe retiré : `/api/habits` → `backend:3000/habits`). Plus de CORS ni d'URL
d'API en dur ; la base n'est exposée sur aucun port hôte.

## Mise en route

```bash
cp docker/.env.prod.example docker/.env.prod   # puis éditer (mot de passe DB, WEB_PORT)
make prod-init                                  # build + démarrage
```

Le front écoute alors sur `http://<hote>:${WEB_PORT}` (défaut **8080**), l'API
sous `/api`.

### Variables (`docker/.env.prod`)

- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — identifiants PostgreSQL de prod.
- `WEB_PORT` — port hôte du front nginx (`80` pour exposition directe, sinon
  laisser `8080` derrière un reverse-proxy hôte).

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

## TLS / nom de domaine

Le compose expose du HTTP simple. Pour le HTTPS, placer un reverse-proxy hôte
(Caddy, Traefik, ou nginx système avec certbot) devant le port `WEB_PORT` et y
gérer le certificat. nginx interne transmet déjà `X-Forwarded-Proto`.

## Base de données

TypeORM tourne en `synchronize: true` (pas de migrations) : le schéma est
créé/ajusté au démarrage du backend. **À surveiller en prod** dès qu'il y a des
données à préserver — une modif d'entité altère le schéma au redémarrage.
Sauvegardes recommandées via `pg_dump` sur le conteneur `progression-prod-db`.
