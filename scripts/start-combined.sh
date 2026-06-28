#!/bin/bash
set -e

echo "Starting Keycloak on port 8080..."
# JDBC DB URL from env
export KC_DB=postgres
export KC_DB_URL="jdbc:postgresql://${DB_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}:${DB_PORT:-6543}/${DB_NAME:-postgres}"
export KC_DB_USERNAME="${DB_USERNAME}"
export KC_DB_PASSWORD="${DB_PASSWORD}"

/opt/keycloak/bin/kc.sh start-dev --http-port=8080 --import-realm &

echo "Starting FastAPI on port 8000..."
# Set FastAPI database URL using standard Postgres scheme
export IAM_DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}:${DB_PORT:-6543}/${DB_NAME:-postgres}"
export IAM_KEYCLOAK_BASE_URL="http://127.0.0.1:8080"
export IAM_OIDC_ISSUER="${IAM_OIDC_ISSUER:-https://iitdeveloper-iam.hf.space/realms/iitd}"

uvicorn iitd_iam.main:app --host 0.0.0.0 --port 8000 &

echo "Starting Nginx Reverse Proxy on port 7860..."
nginx -g "daemon off;"
