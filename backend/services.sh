#!/bin/bash
# ============================================================
# services.sh — Start all Datashifter backend services
#
# Usage:
#   chmod +x services.sh
#   ./services.sh          # start all services
#   ./services.sh stop     # stop all services
#   ./services.sh status   # check which are running
#   ./services.sh logs     # tail all logs
# ============================================================

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$BACKEND_DIR/.logs"
PID_DIR="$BACKEND_DIR/.pids"
BACKUP_EXISTING_LOGS=true  # Set to true to keep old logs with timestamp suffix

SERVICES=(
  "gateway-service"
  "auth-service"
  "connector-service"
  "pipeline-service"
  "monitor-service"
  "execution-engine"
  "notification-service"
  "payment-service"
)

PORTS=(8080 8086 8081 8082 8083 8084 8085 8087)

mkdir -p "$LOG_DIR" "$PID_DIR"

# ============================================================
# LOG MANAGEMENT
# ============================================================
backup_existing_logs() {
  if [ -z "$(ls -A "$LOG_DIR"/*.log 2>/dev/null)" ]; then
    return
  fi
  if [ "$BACKUP_EXISTING_LOGS" = true ]; then
    backup_dir="$LOG_DIR/.logs_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    mv "$LOG_DIR"/*.log "$backup_dir"/ 2>/dev/null
    echo "Existing logs moved to $backup_dir/"
  else
    rm -f "$LOG_DIR"/*.log
  fi
}

# ============================================================
# ENV LOADING
# ============================================================
load_env() {
  if [ -f "$BACKEND_DIR/.env.properties" ]; then
    export $(grep -v '^#' "$BACKEND_DIR/.env.properties" | grep -v '^$' | xargs)
  fi
}

# ============================================================
# START
# ============================================================
start_all() {

  backup_existing_logs

  load_env

  echo "Building all modules..."
  cd "$BACKEND_DIR" && mvn clean install -DskipTests -q
  if [ $? -ne 0 ]; then
    echo "Build failed. Fix errors and retry."
    exit 1
  fi
  echo "Build successful."
  echo ""

  for i in "${!SERVICES[@]}"; do
    svc="${SERVICES[$i]}"
    port="${PORTS[$i]}"
    pidfile="$PID_DIR/$svc.pid"
    logfile="$LOG_DIR/$svc.log"

    # Skip if already running
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo "[$svc] Already running (PID $(cat "$pidfile")) on port $port"
      continue
    fi

    echo "[$svc] Starting on port $port..."
    cd "$BACKEND_DIR/$svc"
    mvn spring-boot:run -q > "$logfile" 2>&1 &
    echo $! > "$pidfile"
    cd "$BACKEND_DIR"

    # Brief pause so services don't all hammer DB at once
    sleep 2
  done

  echo ""
  echo "All services started. Logs in $LOG_DIR/"
  echo "Run './services.sh status' to verify."
}

# ============================================================
# STOP
# ============================================================
stop_all() {
  echo "Stopping all services..."
  for svc in "${SERVICES[@]}"; do
    pidfile="$PID_DIR/$svc.pid"
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile")
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "[$svc] Stopped (PID $pid)"
      else
        echo "[$svc] Not running (stale PID)"
      fi
      rm -f "$pidfile"
    else
      echo "[$svc] No PID file"
    fi
  done
  echo "Done."
}

# ============================================================
# STATUS
# ============================================================
status_all() {
  echo ""
  printf "%-25s %-8s %-8s\n" "SERVICE" "PORT" "STATUS"
  printf "%-25s %-8s %-8s\n" "-------" "----" "------"
  for i in "${!SERVICES[@]}"; do
    svc="${SERVICES[$i]}"
    port="${PORTS[$i]}"
    pidfile="$PID_DIR/$svc.pid"
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      printf "%-25s %-8s \033[32m%-8s\033[0m\n" "$svc" "$port" "RUNNING"
    else
      printf "%-25s %-8s \033[31m%-8s\033[0m\n" "$svc" "$port" "STOPPED"
    fi
  done
  echo ""
}

# ============================================================
# LOGS
# ============================================================
tail_logs() {
  echo "Tailing all logs (Ctrl+C to stop)..."
  tail -f "$LOG_DIR"/*.log
}

# ============================================================
# MAIN
# ============================================================
case "${1:-start}" in
  start)  start_all ;;
  stop)   stop_all ;;
  status) status_all ;;
  logs)   tail_logs ;;
  *)      echo "Usage: $0 {start|stop|status|logs}" ;;
esac