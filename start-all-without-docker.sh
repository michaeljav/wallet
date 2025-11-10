#!/usr/bin/env bash
# start-all-without-docker.sh — Levanta wallet sin Docker (solo Mongo debe estar corriendo local).

set -euo pipefail

here="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
logdir="$here/.logs"
mkdir -p "$logdir"

say() { printf "\n%s\n" "$*" >&2; }
fail() { printf "\nERROR: %s\n" "$*" >&2; exit 1; }

# Cierre limpio de procesos hijos
pids=()
cleanup() {
  say "Cerrando servicios..."
  if [[ ${#pids[@]} -gt 0 ]]; then
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        sleep 0.5
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
  say "Listo."
}
trap cleanup EXIT INT TERM

cd "$here"

# Requisitos
command -v node >/dev/null 2>&1 || fail "Node.js no está en PATH."
command -v npm  >/dev/null 2>&1 || fail "npm no está en PATH."

node_ver_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "$node_ver_major" -lt 18 ]]; then
  fail "Se requiere Node 18+ (ideal 20+). Detectado: $(node -v)"
fi

# Verificación superficial de Mongo en 27017
if ! ( (command -v netstat >/dev/null 2>&1 && netstat -ano | tr -d '\r' | grep -q ':27017') \
   || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 27017 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
  say "Aviso: no se detecta MongoDB escuchando en 27017. Inícialo antes de probar las APIs."
fi

# Cargar variables locales si existen (toman prioridad)
if [[ -f ./.env.local ]]; then
  say "Cargando variables de .env.local"
  set -a
  # shellcheck disable=SC1091
  source ./.env.local
  set +a
fi

# Variables de entorno por defecto
export WALLET_DB_PORT="${WALLET_DB_PORT:-3001}"
export WALLET_API_PORT="${WALLET_API_PORT:-3000}"
export CLIENT_PORT="${CLIENT_PORT:-5173}"
export MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/walletdb}"
export MAIL_TRANSPORT="${MAIL_TRANSPORT:-ethereal}"
export MAIL_FROM="${MAIL_FROM:-no-reply@wallet.local}"
export WALLET_DB_BASE_URL="${WALLET_DB_BASE_URL:-http://localhost:${WALLET_DB_PORT}}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:${WALLET_API_PORT}}"

say "Usando MONGO_URI=$MONGO_URI"

ensure_deps() {
  local dir="$1"
  cd "$dir"
  if [[ ! -d node_modules ]]; then
    say "Instalando dependencias en $dir..."
    npm ci
  fi
}

start_wallet_db() {
  local dir="$here/services/wallet-db"
  ensure_deps "$dir"
  if [[ ! -d "$dir/node_modules/@types/nodemailer" ]]; then
    (cd "$dir" && npm i -D @types/nodemailer >/dev/null 2>&1 || true)
  fi
  say "Iniciando wallet-db en puerto $WALLET_DB_PORT..."
  cd "$dir"
  PORT="$WALLET_DB_PORT" \
  MONGO_URI="$MONGO_URI" \
  MAIL_TRANSPORT="$MAIL_TRANSPORT" \
  MAIL_FROM="$MAIL_FROM" \
  npm run start:dev >"$logdir/wallet-db.log" 2>&1 &
  pids+=("$!")
  say "wallet-db PID ${pids[-1]} (log: $logdir/wallet-db.log)"
}

start_wallet_api() {
  local dir="$here/services/wallet-api"
  ensure_deps "$dir"
  say "Iniciando wallet-api en puerto $WALLET_API_PORT..."
  cd "$dir"
  PORT="$WALLET_API_PORT" \
  WALLET_DB_BASE_URL="$WALLET_DB_BASE_URL" \
  npm run start:dev >"$logdir/wallet-api.log" 2>&1 &
  pids+=("$!")
  say "wallet-api PID ${pids[-1]} (log: $logdir/wallet-api.log)"
}

start_client() {
  local dir="$here/client"
  ensure_deps "$dir"
  # Garantiza .env.development con la URL del API
  if ! grep -q "VITE_API_BASE_URL" "$dir/.env.development" 2>/dev/null; then
    echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> "$dir/.env.development"
  fi
  say "Iniciando client (Vite) en puerto $CLIENT_PORT..."
  cd "$dir"
  npm run dev -- --port "$CLIENT_PORT" --strictPort >"$logdir/client.log" 2>&1 &
  pids+=("$!")
  say "client PID ${pids[-1]} (log: $logdir/client.log)"
}

start_wallet_db
start_wallet_api
start_client

say "Servicios levantados:"
say "  MongoDB       : mongodb://localhost:27017 (debe estar corriendo local)"
say "  wallet-db     : http://localhost:${WALLET_DB_PORT}"
say "  wallet-api    : http://localhost:${WALLET_API_PORT}"
say "  client (Vite) : http://localhost:${CLIENT_PORT}"

say "Pruebas rápidas (otra terminal Git Bash):"
cat <<'TESTS'
curl -i -X POST "http://localhost:3000/clients/register" \
  -H "Content-Type: application/json" \
  -d '{"document":"02900161072","name":"Michael","email":"michaeljaviermota@gmail.com","phone":"8298657498"}'

curl -i -X POST "http://localhost:3000/wallet/topup" \
  -H "Content-Type: application/json" \
  -d '{"document":"02900161072","phone":"8298657498","amountCents":10000}'

curl -s "http://localhost:3000/wallet/balance?document=02900161072&phone=8298657498"
TESTS

say "Para ver logs:"
say "  tail -f \"$logdir/wallet-db.log\""
say "  tail -f \"$logdir/wallet-api.log\""
say "  tail -f \"$logdir/client.log\""

say "Presiona Ctrl+C para detener todos los servicios."
wait
