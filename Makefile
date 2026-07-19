COMPOSE ?= $(shell if command -v docker >/dev/null 2>&1; then echo "docker compose"; else echo "podman compose"; fi)

.PHONY: env build start stop restart logs api-logs admin-logs keycloak-logs ps migrate reset clean

env:
	@test -f .env || cp .env.example .env
	@echo ".env is ready"

build: env
	$(COMPOSE) build

start: env
	$(COMPOSE) up -d --build

stop:
	$(COMPOSE) down

restart: stop start

logs:
	$(COMPOSE) logs -f --tail=150

api-logs:
	$(COMPOSE) logs -f --tail=150 iam-api

admin-logs:
	$(COMPOSE) logs -f --tail=150 iam-admin

keycloak-logs:
	$(COMPOSE) logs -f --tail=150 keycloak

ps:
	$(COMPOSE) ps

migrate: env
	$(COMPOSE) run --rm migrate

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build

clean:
	$(COMPOSE) down -v --remove-orphans
