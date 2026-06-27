COMPOSE = docker compose -f docker/docker-compose.yml

.PHONY: init dc-build dc-up dc-down dc-restart dc-logs dc-ps dc-clean \
        prod-build prod-frontend prod-backend prod-deploy

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

# ================== PRODUCTION (VPS, sans Docker) ==================
# Installation native : Node + PostgreSQL + nginx. Voir docs/deploiement/production.md.
# Le frontend est servi en statique par nginx (root = /var/www/core-app) ;
# le backend tourne via systemd (service core-app-backend).

WEB_ROOT ?= /var/www/core-app

## prod-frontend : build du front (API sous /api) + déploiement dans WEB_ROOT
prod-frontend:
	cd frontend && npm ci && VITE_API_URL=/api npm run build
	sudo mkdir -p $(WEB_ROOT)
	sudo rsync -a --delete frontend/dist/ $(WEB_ROOT)/

## prod-backend : build du back + (re)démarrage du service systemd
prod-backend:
	cd backend && npm ci && npm run build
	sudo systemctl restart core-app-backend

## prod-build : build front + back (sans déployer le service)
prod-build:
	cd backend && npm ci && npm run build
	cd frontend && npm ci && VITE_API_URL=/api npm run build

## prod-deploy : déploiement complet (front + back) après un git pull
prod-deploy: prod-backend prod-frontend
	@echo "✅ Déploiement terminé. nginx sert $(WEB_ROOT), API via systemd."
