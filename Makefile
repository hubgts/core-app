COMPOSE = docker compose -f docker/docker-compose.yml
COMPOSE_PROD = docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.prod

.PHONY: init dc-build dc-up dc-down dc-restart dc-logs dc-ps dc-clean \
        prod-init prod-build prod-up prod-down prod-restart prod-logs prod-ps prod-clean

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

## dc-build : construit les images Docker
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

# ======================= PRODUCTION (VPS) =======================
# Nécessite docker/.env.prod (cp docker/.env.prod.example docker/.env.prod).

## prod-init : build + démarrage prod (Caddy expose 80/443 + HTTPS auto)
prod-init: prod-build prod-up
	@echo ""
	@echo "======================================================"
	@echo "  ✅  core-app (PROD) démarré !"
	@echo "======================================================"
	@echo "  ➡️   Web : https://emiliengantois.fr  (API sous /api, HTTPS via Caddy)"
	@echo "  Logs : make prod-logs   |   Arrêt : make prod-down"
	@echo "======================================================"
	@echo ""

## prod-build : construit les images de production
prod-build:
	$(COMPOSE_PROD) build

## prod-up : démarre les conteneurs de prod et attend qu'ils soient sains
prod-up:
	$(COMPOSE_PROD) up -d --wait

## prod-down : arrête et supprime les conteneurs de prod
prod-down:
	$(COMPOSE_PROD) down

## prod-restart : redémarre la prod (down + up)
prod-restart: prod-down prod-up

## prod-logs : affiche les logs de prod en direct
prod-logs:
	$(COMPOSE_PROD) logs -f

## prod-ps : liste l'état des conteneurs de prod
prod-ps:
	$(COMPOSE_PROD) ps

## prod-clean : arrête la prod et supprime volumes + images locales (EFFACE LA BASE !)
prod-clean:
	$(COMPOSE_PROD) down -v --rmi local
