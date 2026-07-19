#!/usr/bin/env bash
set -euo pipefail

echo "IITD IAM development bootstrap"
echo "1. Copy .env.example to .env: make env"
echo "2. Build containers: make build"
echo "3. Start the platform with automatic migrations: make start"
echo "4. Stop the platform: make stop"
