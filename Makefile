COMPOSE = docker compose -f docker/docker-compose.yml
WEB_ROOT ?= /var/www/core-app

# Serveur de production (pour `make deploy-prod` depuis un poste local).
PROD_SSH ?= egantois@137.74.112.112
PROD_DIR ?= ~/projects/core-app

.PHONY: init dc-build dc-up dc-down dc-restart dc-logs dc-ps dc-clean \
        update-dev update-prod deploy-prod check import-foods

## init : construit les images, démarre les conteneurs et attend qu'ils soient prêts
init: dc-build dc-up
	@echo ""
	@echo "======================================================"
	@echo "  ✅  Projet core-app initialisé avec succès !"
	@echo "======================================================"
	@echo "  ➡️   API (backend)  : http://localhost:3000"
	@echo "  ➡️   Web (frontend) : http://localhost:5173"
	@echo "======================================================"
	@echo "  Logs en direct : make dc-logs   |   Arrêt : make dc-down"
	@echo ""

## dc-build : construit les images Docker (DEV uniquement)
dc-build:
	$(COMPOSE) build

## dc-up : démarre les conteneurs en arrière-plan et attend qu'ils soient sains
dc-up:
	$(COMPOSE) up -d --wait

## dc-down : arrête et supprime les conteneurs
dc-down:
	$(COMPOSE) down

## dc-restart : redémarre les conteneurs (down + up)
dc-restart: dc-down dc-up

## dc-logs : affiche les logs en direct
dc-logs:
	$(COMPOSE) logs -f

## dc-ps : liste l'état des conteneurs
dc-ps:
	$(COMPOSE) ps

## dc-clean : arrête tout et supprime les volumes + images locales
dc-clean:
	$(COMPOSE) down -v --rmi local

## import-foods : importe data/foods.sql dans la base (idempotent, rejouable)
# Import purement SQL (aucun code applicatif, aucun rebuild, aucun impact prod).
# - LOCAL : si le conteneur `db` tourne, on joue le SQL dedans via psql.
# - PROD  : sinon, psql natif en chargeant les identifiants de backend.env.
# Le SQL fait INSERT ... ON CONFLICT (name_key) : crée l'aliment absent, met à
# jour seulement si une macro (ou l'unité) diffère, laisse le reste intact.
PROD_ENV_FILE ?= /etc/core-app/backend.env
import-foods:
	@if $(COMPOSE) ps --status running --services 2>/dev/null | grep -qx db; then \
	  echo "→ Import via le conteneur Docker (db)"; \
	  $(COMPOSE) exec -T db psql -U progression -d progression < data/foods.sql; \
	else \
	  echo "→ Import via psql natif (prod), env : $(PROD_ENV_FILE)"; \
	  set -a; . $(PROD_ENV_FILE); set +a; \
	  PGPASSWORD="$$DB_PASSWORD" psql -h "$${DB_HOST:-localhost}" -p "$${DB_PORT:-5432}" \
	    -U "$$DB_USER" -d "$$DB_NAME" -v ON_ERROR_STOP=1 -f data/foods.sql; \
	fi
	@echo "✅ Aliments importés (idempotent)."

## update-dev : met à jour le dev (git pull + rebuild images + redémarrage)
update-dev:
	git pull
	$(COMPOSE) up -d --build --wait
	@echo "✅ Dev à jour : http://localhost:5173 (API :3000)"

# ================== QUALITÉ DU CODE ==================
# Analyse statique + lint + formatage (analogue à PHPStan / PHP-CS-Fixer).

## check : tout vérifier — typecheck back + ESLint & Prettier (back + front)
check:
	cd backend && npm run typecheck && npm run lint && npm run format:check
	cd frontend && npm run lint && npm run format:check

# ================== PRODUCTION (VPS, sans Docker) ==================
# Installation native : Node + PostgreSQL + nginx. Voir docs/deploiement/production.md.
# Le backend tourne via systemd (core-app-backend) ; le frontend est servi en
# statique par nginx depuis WEB_ROOT (défaut /var/www/core-app).

## update-prod : met à jour la prod (git pull + back via systemd + front via nginx)
update-prod:
	git pull
	cd backend && npm ci && npm run build
	sudo systemctl restart core-app-backend
	cd frontend && npm ci && VITE_API_URL=/api npm run build
	sudo mkdir -p $(WEB_ROOT)
	sudo rsync -a --delete frontend/dist/ $(WEB_ROOT)/
	@echo "✅ Prod à jour : backend (systemd) redémarré, front déployé dans $(WEB_ROOT)"

## deploy-prod : depuis un poste local — SSH vers la prod et y lance `make update-prod`
# -t : alloue un pseudo-terminal pour que les prompts sudo (systemctl, rsync)
# de update-prod restent interactifs à distance.
deploy-prod:
	ssh -t $(PROD_SSH) 'cd $(PROD_DIR) && make update-prod'
