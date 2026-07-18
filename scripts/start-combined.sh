#!/usr/bin/env bash
set -Eeuo pipefail

KEYCLOAK_PID=""
API_PID=""
NGINX_PID=""

cleanup() {
echo "Stopping IAM services..."

for pid in "$NGINX_PID" "$API_PID" "$KEYCLOAK_PID"; do
if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
kill "$pid" 2>/dev/null || true
fi
done

wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

require_env() {
local variable_name="$1"

if [[ -z "${!variable_name:-}" ]]; then
echo "Missing required environment variable: ${variable_name}" >&2
exit 1
fi
}

# FastAPI configuration

require_env IAM_DATABASE_URL
require_env IAM_REDIS_URL
require_env IAM_ENVIRONMENT
require_env IAM_OIDC_ISSUER
require_env IAM_OIDC_JWKS_URL
require_env IAM_OIDC_AUDIENCE

# Keycloak database configuration

require_env KC_DB_URL
require_env KC_DB_USERNAME
require_env KC_DB_PASSWORD

export KC_DB="${KC_DB:-postgres}"

export KC_HTTP_ENABLED="${KC_HTTP_ENABLED:-true}"
export KC_HTTP_PORT="${KC_HTTP_PORT:-8080}"
export KC_PROXY_HEADERS="${KC_PROXY_HEADERS:-xforwarded}"

export KC_HOSTNAME="${KC_HOSTNAME:-https://iitdeveloper-iam.hf.space}"
export KC_HOSTNAME_STRICT="${KC_HOSTNAME_STRICT:-false}"

export IAM_KEYCLOAK_BASE_URL="${IAM_KEYCLOAK_BASE_URL:-http://127.0.0.1:8080}"

echo "Validating Nginx configuration..."
nginx -t

echo "Starting Keycloak on port 8080..."

# KC_DB_URL should already contain:

# jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?prepareThreshold=0

/opt/keycloak/bin/kc.sh start --optimized \
--http-port=8080 \
--import-realm &

KEYCLOAK_PID=$!

echo "Waiting for Keycloak..."

KEYCLOAK_READY=false

for attempt in $(seq 1 90); do
if ! kill -0 "$KEYCLOAK_PID" 2>/dev/null; then
echo "Keycloak exited during startup." >&2
wait "$KEYCLOAK_PID" || true
exit 1
fi

if curl \
--fail \
--silent \
--show-error \
--max-time 5 \
"http://127.0.0.1:8080/realms/iitd/.well-known/openid-configuration" \
>/dev/null; then
KEYCLOAK_READY=true
echo "Keycloak is ready."
break
fi

echo "Waiting for Keycloak (${attempt}/90)..."
sleep 2
done

if [[ "$KEYCLOAK_READY" != "true" ]]; then
echo "Keycloak did not become ready within 180 seconds." >&2
exit 1
fi

echo "Applying IAM database migrations..."

cd /app
alembic upgrade head

echo "IAM migrations completed."

echo "Starting FastAPI on port 8000..."

uvicorn iitd_iam.main:app \
--host 127.0.0.1 \
--port 8000 \
--proxy-headers \
--forwarded-allow-ips="127.0.0.1" &

API_PID=$!

echo "Waiting for FastAPI..."

API_READY=false

for attempt in $(seq 1 60); do
if ! kill -0 "$API_PID" 2>/dev/null; then
echo "FastAPI exited during startup." >&2
wait "$API_PID" || true
exit 1
fi

if curl \
--fail \
--silent \
--show-error \
--max-time 5 \
"http://127.0.0.1:8000/health/live" \
>/dev/null; then
API_READY=true
echo "FastAPI is ready."
break
fi

echo "Waiting for FastAPI (${attempt}/60)..."
sleep 1
done

if [[ "$API_READY" != "true" ]]; then
echo "FastAPI did not become ready within 60 seconds." >&2
exit 1
fi

echo "Starting Nginx reverse proxy on port 7860..."

nginx -g "daemon off;" &

NGINX_PID=$!

sleep 2

if ! kill -0 "$NGINX_PID" 2>/dev/null; then
echo "Nginx failed to start." >&2
wait "$NGINX_PID" || true
exit 1
fi

echo "All IAM services started successfully."
echo "Public URL: https://iitdeveloper-iam.hf.space"

# Stop the container if Keycloak, FastAPI, or Nginx exits.

set +e
wait -n "$KEYCLOAK_PID" "$API_PID" "$NGINX_PID"
EXIT_CODE=$?
set -e

echo "A critical IAM process exited with code ${EXIT_CODE}." >&2
exit "$EXIT_CODE"
