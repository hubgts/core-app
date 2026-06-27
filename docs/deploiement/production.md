# Déploiement en production (VPS, installation native)

La prod tourne **sans Docker** : Node, PostgreSQL et nginx installés directement
sur le VPS. Le dev local, lui, continue d'utiliser Docker (`make init`) — il n'est
pas concerné par ce document.

## Architecture

```
Internet ──80/443──▶ nginx (TLS certbot + Basic Auth htpasswd)
                        │  ├── /        -> /var/www/core-app (build React statique)
                        │  └── /api/    -> 127.0.0.1:3000 (backend NestJS, systemd)
                        ▼
                   PostgreSQL local (127.0.0.1:5432)
```

| Élément | Mise en œuvre |
|---|---|
| Backend | `node dist/main`, lancé par **systemd** (`core-app-backend`) |
| Frontend | build Vite (`VITE_API_URL=/api`) servi en statique par **nginx** |
| Base | **PostgreSQL** système, sur `localhost` |
| Entrée publique | **nginx** (80/443) |
| HTTPS | **certbot** (Let's Encrypt, renouvellement auto) |
| Accès protégé | **Basic Auth nginx** via `htpasswd` (`/etc/nginx/.htpasswd`) |
| Secrets backend | `/etc/core-app/backend.env` (hors dépôt) |

Fichiers de référence dans le dépôt : `deploy/core-app-backend.service`,
`deploy/nginx.conf`, `deploy/backend.env.example`.

## Prérequis (à installer une fois)

```bash
# Node.js 18 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL, nginx, certbot, htpasswd
sudo apt install -y postgresql nginx certbot python3-certbot-nginx apache2-utils
```

## Base de données

```bash
sudo -u postgres psql <<'SQL'
CREATE USER sunday WITH PASSWORD 'change-moi-mot-de-passe-fort';
CREATE DATABASE core OWNER sunday;
SQL
```
(Le schéma est créé automatiquement au premier démarrage du backend —
TypeORM `synchronize: true`.)

## Backend (systemd)

```bash
cd ~/projects/core-app/backend
npm ci && npm run build

# Config / secrets (hors dépôt)
sudo mkdir -p /etc/core-app
sudo cp ../deploy/backend.env.example /etc/core-app/backend.env
sudo nano /etc/core-app/backend.env        # renseigner DB_USER/PASSWORD/NAME
sudo chmod 600 /etc/core-app/backend.env

# Service
sudo cp ../deploy/core-app-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now core-app-backend
sudo systemctl status core-app-backend     # doit être "active (running)"
curl -I http://127.0.0.1:3000              # le backend répond
```

## Frontend (build statique)

```bash
cd ~/projects/core-app
make prod-frontend     # build (VITE_API_URL=/api) + copie dans /var/www/core-app
```

## nginx + HTTPS + mot de passe

```bash
# Site nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/core-app
sudo ln -sf /etc/nginx/sites-available/core-app /etc/nginx/sites-enabled/core-app
sudo rm -f /etc/nginx/sites-enabled/default

# Mot de passe d'accès (Basic Auth)
sudo htpasswd -c /etc/nginx/.htpasswd egantois   # demande le mot de passe

# Vérif + activation
sudo nginx -t && sudo systemctl reload nginx

# Certificat HTTPS (ajoute le bloc 443 et la redirection, renouvellement auto)
sudo certbot --nginx -d emiliengantois.fr -d www.emiliengantois.fr
```

Pare-feu : `80/tcp` et `443/tcp` ouverts (`sudo ufw allow 80/tcp 443/tcp`).

## Vérification

```bash
curl -sI https://emiliengantois.fr | head -1                       # 401 (sans identifiants)
curl -sI -u egantois:MDP https://emiliengantois.fr | head -1       # 200
```
Puis ouvrir `https://emiliengantois.fr` : fenêtre de login, puis l'appli charge
(les appels `/api` passent avec les mêmes identifiants, même origine).

## Mises à jour

```bash
cd ~/projects/core-app
git pull
make prod-deploy        # rebuild back (+ restart systemd) et front (+ copie nginx)
```
Pas besoin de toucher nginx ni certbot pour une simple MAJ de code.

## Ajouter / changer le mot de passe

```bash
sudo htpasswd /etc/nginx/.htpasswd egantois   # change le mdp d'un user existant
sudo htpasswd /etc/nginx/.htpasswd autreuser  # ajoute un user (sans -c)
sudo systemctl reload nginx
```

## Sauvegardes

```bash
pg_dump -U sunday -h localhost core > backup_$(date +%F).sql
```

## Logs / dépannage

```bash
sudo journalctl -u core-app-backend -f     # logs backend
sudo tail -f /var/log/nginx/error.log      # logs nginx
sudo systemctl restart core-app-backend    # redémarrer le backend
```
