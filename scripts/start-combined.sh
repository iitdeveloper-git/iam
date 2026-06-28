#!/bin/bash
set -e

# Parse PostgreSQL connection string components: postgresql://user:password@host:port/database
# We extract username, password, host, port and database separately to construct a clean JDBC URL.
DB_USER=$(echo "$IAM_DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
DB_PASS=$(echo "$IAM_DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
DB_HOST_PORT_DB=$(echo "$IAM_DATABASE_URL" | sed -E 's|postgresql://[^@]+@([^/]+)/?.*|\1|')
DB_NAME=$(echo "$IAM_DATABASE_URL" | sed -E 's|postgresql://[^@]+@[^/]+/([^?]+).*|\1|')

echo "Starting Keycloak on port 8080..."
export KC_DB=postgres
export KC_DB_URL="jdbc:postgresql://${DB_HOST_PORT_DB}/${DB_NAME}"
export KC_DB_USERNAME="$DB_USER"
export KC_DB_PASSWORD="$DB_PASS"

/opt/keycloak/bin/kc.sh start-dev --http-port=8080 --import-realm &

echo "Starting FastAPI on port 8000..."
export IAM_DATABASE_URL="${IAM_DATABASE_URL}"
export IAM_KEYCLOAK_BASE_URL="http://127.0.0.1:8080"
export IAM_OIDC_ISSUER="${IAM_OIDC_ISSUER:-https://iitdeveloper-iam.hf.space/realms/iitd}"

uvicorn iitd_iam.main:app --host 0.0.0.0 --port 8000 &

echo "Starting Nginx Reverse Proxy on port 7860..."
nginx -g "daemon off;"
