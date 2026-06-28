#!/usr/bin/env bash
set -euo pipefail

echo "IITD IAM development bootstrap"
echo "1. Copy .env.example to .env and replace all placeholder secrets."
echo "2. Start dependencies: podman compose up -d postgres redis keycloak"
echo "3. Run migrations: podman compose --profile tools run --rm migrate"
echo "4. Start the platform: podman compose up -d"

