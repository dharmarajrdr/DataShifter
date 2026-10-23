#!/usr/bin/env bash
# ==============================================================================
# oracle_db.sh — Open an interactive SQL*Plus session in the Oracle container
#
# Usage:
#   ./oracle_db.sh                       # Connect as SYSTEM to FREEPDB1
#   ./oracle_db.sh dev                   # Connect as DEV_USER to FREEPDB1
#   ./oracle_db.sh sys                   # Connect as SYSDBA (/ as sysdba)
#   ./oracle_db.sh <user>/<pass>@<pdb>   # Connect with custom credentials
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="oracle-db"
DEFAULT_TARGET="SYSTEM/Oracle123@FREEPDB1"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  CONTAINER_NAME=$(docker ps --filter "name=oracle" --format '{{.Names}}' | head -n 1)
fi

if [ -z "${CONTAINER_NAME}" ]; then
  echo "❌ Error: Oracle container is not running." >&2
  exit 1
fi

TTY_FLAG="-i"
if [ -t 0 ] && [ -t 1 ]; then
  TTY_FLAG="-it"
fi

if [ $# -eq 0 ]; then
  TARGET="${DEFAULT_TARGET}"
elif [ "$1" = "dev" ] || [ "$1" = "dev_user" ]; then
  TARGET="DEV_USER/Dev123@FREEPDB1"
  shift
elif [ "$1" = "sys" ] || [ "$1" = "sysdba" ]; then
  TARGET="/ as sysdba"
  shift
else
  TARGET="$1"
  shift
fi

exec docker exec ${TTY_FLAG} "${CONTAINER_NAME}" sqlplus ${TARGET} "$@"
