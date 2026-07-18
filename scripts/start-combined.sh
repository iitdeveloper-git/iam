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

write_nginx_config() {
local keycloak_base_url="${IAM_KEYCLOAK_BASE_URL%/}"

if [[ "$IAM_EMBEDDED_KEYCLOAK" == "true" ]]; then
cat >/etc/nginx/nginx.conf <<'NGINX'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 7860;
        server_name localhost;

        location /admin {
            proxy_pass http://127.0.0.1:8080/admin;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /realms {
            proxy_pass http://127.0.0.1:8080/realms;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /resources {
            proxy_pass http://127.0.0.1:8080/resources;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /js {
            proxy_pass http://127.0.0.1:8080/js;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://127.0.0.1:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINX
else
cat >/etc/nginx/nginx.conf <<NGINX
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 7860;
        server_name localhost;

        location ~ ^/(admin|realms|resources|js)(/.*)?$ {
            return 308 ${keycloak_base_url}\$request_uri;
        }

        location / {
            proxy_pass http://127.0.0.1:8000/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
NGINX
fi
}

export IAM_KEYCLOAK_BASE_URL="${IAM_KEYCLOAK_BASE_URL:-http://127.0.0.1:8080}"
export IAM_EMBEDDED_KEYCLOAK="${IAM_EMBEDDED_KEYCLOAK:-auto}"

if [[ "$IAM_EMBEDDED_KEYCLOAK" == "auto" ]]; then
case "$IAM_KEYCLOAK_BASE_URL" in
http://127.0.0.1:*|http://localhost:*)
IAM_EMBEDDED_KEYCLOAK="true"
;;
*)
IAM_EMBEDDED_KEYCLOAK="false"
;;
esac
fi

write_nginx_config

echo "Validating Nginx configuration..."
nginx -t

if [[ "$IAM_EMBEDDED_KEYCLOAK" == "true" ]]; then
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

echo "Starting embedded Keycloak on port 8080..."

# jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?prepareThreshold=0

/opt/keycloak/bin/kc.sh start --optimized \
--http-port=8080 \
--import-realm &

KEYCLOAK_PID=$!
KEYCLOAK_READY_URL="http://127.0.0.1:8080/realms/iitd/.well-known/openid-configuration"
else
echo "Using external Keycloak at ${IAM_KEYCLOAK_BASE_URL}; embedded Keycloak startup skipped."
KEYCLOAK_READY_URL="${IAM_OIDC_ISSUER%/}/.well-known/openid-configuration"
fi

echo "Waiting for Keycloak..."

KEYCLOAK_READY=false
KEYCLOAK_WAIT_MAX_TIME="${KEYCLOAK_WAIT_MAX_TIME:-20}"
KEYCLOAK_WAIT_SLEEP="${KEYCLOAK_WAIT_SLEEP:-2}"
KEYCLOAK_WAIT_ATTEMPTS="${KEYCLOAK_WAIT_ATTEMPTS:-90}"
if [[ "$IAM_EMBEDDED_KEYCLOAK" != "true" ]]; then
KEYCLOAK_WAIT_MAX_TIME="${KEYCLOAK_WAIT_MAX_TIME_EXTERNAL:-5}"
KEYCLOAK_WAIT_SLEEP="${KEYCLOAK_WAIT_SLEEP_EXTERNAL:-5}"
KEYCLOAK_WAIT_ATTEMPTS="${KEYCLOAK_WAIT_ATTEMPTS_EXTERNAL:-3}"
fi

for attempt in $(seq 1 "$KEYCLOAK_WAIT_ATTEMPTS"); do
if [[ -n "$KEYCLOAK_PID" ]]; then
if ! kill -0 "$KEYCLOAK_PID" 2>/dev/null; then
echo "Keycloak exited during startup." >&2
wait "$KEYCLOAK_PID" || true
exit 1
fi
fi

if [[ "$IAM_EMBEDDED_KEYCLOAK" != "true" ]]; then
HTTP_STATUS=$(curl \
--silent \
--show-error \
--max-time "$KEYCLOAK_WAIT_MAX_TIME" \
--output /dev/null \
--write-out "%{http_code}" \
"$KEYCLOAK_READY_URL" || true)

case "$HTTP_STATUS" in
200|401|403|429)
KEYCLOAK_READY=true
echo "Keycloak is reachable with HTTP ${HTTP_STATUS}."
break
;;
*)
echo "Keycloak readiness returned HTTP ${HTTP_STATUS:-000}."
;;
esac
else
if curl \
--fail \
--silent \
--show-error \
--max-time "$KEYCLOAK_WAIT_MAX_TIME" \
"$KEYCLOAK_READY_URL" \
>/dev/null; then
KEYCLOAK_READY=true
echo "Keycloak is ready."
break
fi
fi

echo "Waiting for Keycloak (${attempt}/${KEYCLOAK_WAIT_ATTEMPTS})..."
sleep "$KEYCLOAK_WAIT_SLEEP"
done

if [[ "$KEYCLOAK_READY" != "true" ]]; then
if [[ "$IAM_EMBEDDED_KEYCLOAK" != "true" ]]; then
echo "External Keycloak did not answer readiness checks; continuing IAM startup." >&2
echo "OIDC login may fail until ${KEYCLOAK_READY_URL} is reachable from the Space." >&2
else
echo "Keycloak did not become ready within 180 seconds." >&2
exit 1
fi
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
if [[ -n "$KEYCLOAK_PID" ]]; then
wait -n "$KEYCLOAK_PID" "$API_PID" "$NGINX_PID"
else
wait -n "$API_PID" "$NGINX_PID"
fi
EXIT_CODE=$?
set -e

echo "A critical IAM process exited with code ${EXIT_CODE}." >&2
exit "$EXIT_CODE"
