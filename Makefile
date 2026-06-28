COMPOSE = docker compose -f docker/docker-compose.yml
WEB_ROOT ?= /var/www/core-app

.PHONY: init dc-build dc-up dc-down dc-restart dc-logs dc-ps dc-clean \
        update-dev update-prod check

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
