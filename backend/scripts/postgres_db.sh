#!/usr/bin/env bash
# ==============================================================================
# postgres_db.sh — Open an interactive psql session in the PostgreSQL container
#
# Usage:
#   ./postgres_db.sh                     # Interactive psql shell
#   ./postgres_db.sh -c "SELECT 1;"      # Execute a single command
#   ./postgres_db.sh -d other_db         # Connect to another database
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="backend-postgres-1"
DB_USER="datashifter"
DB_NAME="datashifter_db"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  CONTAINER_NAME=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -n 1)
fi

if [ -z "${CONTAINER_NAME}" ]; then
  echo "❌ Error: PostgreSQL container is not running." >&2
  exit 1
fi

TTY_FLAG="-i"
if [ -t 0 ] && [ -t 1 ]; then
  TTY_FLAG="-it"
fi

exec docker exec ${TTY_FLAG} "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" "$@"
