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

# Detecta si la URI incluye credenciales (modo con autenticación)
HAS_MONGO_CREDS=false
if [[ "${MONGO_URI:-}" == *"@"* ]]; then
  HAS_MONGO_CREDS=true
fi

# Utilidades mínimas
port_listening() {
  local port="$1"
  if (command -v netstat >/dev/null 2>&1) && netstat -ano 2>/dev/null | tr -d '\r' | grep -q ":${port}"; then
    return 0
  fi
  if (command -v powershell.exe >/dev/null 2>&1); then
    local ok
    ok=$(powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port ${port} | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | tr 'A-Z' 'a-z')
    [[ "$ok" == *true* ]] && return 0
  fi
  return 1
}

docker_has() {
  local name="$1"
  command -v docker >/dev/null 2>&1 || return 1
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${name}$"
}

# Si se usan credenciales y el puerto ya está ocupado por un mongod ajeno a Docker, abortar
if $HAS_MONGO_CREDS && port_listening 27017 && ! docker_has wallet-mongo && ! docker_has wallet-mongo-auth; then
  fail "Puerto 27017 en uso por un proceso externo. Detén tu mongod local o cambia MONGO_URI (sin credenciales)."
fi

# Detecta si la URI incluye credenciales (modo con autenticación)
HAS_MONGO_CREDS=false
if [[ "${MONGO_URI:-}" == *"@"* ]]; then
  HAS_MONGO_CREDS=true
fi

# Garantiza Mongo listo en 27017 según el modo (con o sin auth)
ensure_mongo_ready() {
  # ¿Ya hay algo escuchando en 27017?
  if ( (command -v netstat >/dev/null 2>&1 && netstat -ano | tr -d '\r' | grep -q ':27017') \
     || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 27017 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
    return 0
  fi
  command -v docker >/dev/null 2>&1 || { say "Docker no está disponible y no hay Mongo en 27017. Inícialo manualmente."; return 0; }
  if $HAS_MONGO_CREDS; then
    say "Levantando Mongo con autenticación (docker compose: servicio mongo)..."
    local compose_ok=false
    if command -v docker-compose >/dev/null 2>&1; then
      docker-compose up -d mongo && compose_ok=true || compose_ok=false
    elif docker compose version >/dev/null 2>&1; then
      docker compose up -d mongo && compose_ok=true || compose_ok=false
    fi
    # Espera breve y verifica puerto
    sleep 2
    if ! ( (command -v netstat >/dev/null 2>&1 && netstat -ano 2>/dev/null | tr -d '\r' | grep -q ':27017') \
       || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 27017 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
      # Fallback: levantar contenedor ad‑hoc con auth si compose falló o no está
      say "No se detecta Mongo en 27017 tras 'compose up'. Iniciando contenedor ad-hoc con autenticación (wallet-mongo-auth)..."
      # Cargar posibles credenciales desde .env si existen
      if [[ -f ./.env ]]; then
        # shellcheck disable=SC1091
        source ./.env
      fi
      local u="${MONGO_INITDB_ROOT_USERNAME:-walletroot}"
      local p="${MONGO_INITDB_ROOT_PASSWORD:-walletpass}"
      docker rm -f wallet-mongo-auth >/dev/null 2>&1 || true
      docker run -d --name wallet-mongo-auth -e MONGO_INITDB_ROOT_USERNAME="$u" -e MONGO_INITDB_ROOT_PASSWORD="$p" -p 27017:27017 mongo:7 >/dev/null 2>&1 || true
      sleep 2
    fi
  else
    say "Levantando MongoDB dev (wallet-mongo-dev) sin autenticación..."
    docker rm -f wallet-mongo-dev >/dev/null 2>&1 || true
    docker run -d --name wallet-mongo-dev -p 27017:27017 mongo:7 >/dev/null 2>&1 || true
  fi
  sleep 2
}
# Mongo local: si no hay nada en 27017 y hay Docker, levanta contenedor wallet-mongo
ensure_mongo() {
  # ¿Ya hay algo escuchando en 27017?
  if ( (command -v netstat >/dev/null 2>&1 && netstat -ano | tr -d '\r' | grep -q ':27017') \
     || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 27017 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    # Usamos un nombre distinto para no chocar con docker-compose (wallet-mongo)
    say "Levantando MongoDB local (docker, contenedor: wallet-mongo-dev) sin autenticación..."
    docker rm -f wallet-mongo-dev >/dev/null 2>&1 || true
    docker run -d --name wallet-mongo-dev -p 27017:27017 mongo:7 >/dev/null 2>&1 || true
    sleep 2
  else
    say "Aviso: no se detecta MongoDB en 27017 y no hay Docker disponible. Inícialo manualmente."
  fi
}

ensure_mongo_ready || true

# Si hay Mongo en 27017 proveniente de docker-compose (wallet-mongo con auth),
# y MONGO_URI no trae credenciales, ajusta automáticamente usando .env si existe.
if ( (command -v docker >/dev/null 2>&1) && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^wallet-mongo$' ); then
  if [[ -z "${MONGO_URI:-}" || "${MONGO_URI}" != *"@"* ]]; then
    # Carga credenciales desde .env si existen
    if [[ -f ./.env ]]; then
      # shellcheck disable=SC1091
      source ./.env
    fi
    u="${MONGO_INITDB_ROOT_USERNAME:-walletroot}"
    p="${MONGO_INITDB_ROOT_PASSWORD:-walletpass}"
    db="${MONGO_DB_NAME:-walletdb}"
    export MONGO_URI="mongodb://${u}:${p}@localhost:27017/${db}?authSource=admin"
    say "Detectado Mongo con autenticación (wallet-mongo). Ajustando MONGO_URI=$MONGO_URI"
  fi
fi

# Opcional: SMTP unificado con MailHog si está disponible
ensure_mailhog() {
  if ( (command -v netstat >/dev/null 2>&1 && netstat -ano | tr -d '\r' | grep -q ':1025') \
     || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 1025 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    say "Levantando MailHog local (docker)..."
    docker rm -f wallet-mailhog >/dev/null 2>&1 || true
    docker run -d --name wallet-mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog:v1.0.1 >/dev/null 2>&1 || true
    sleep 1
  fi
}

ensure_mailhog || true
if ( (command -v netstat >/dev/null 2>&1 && netstat -ano | tr -d '\r' | grep -q ':1025') \
  || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Test-NetConnection -ComputerName localhost -Port 1025 | Select-Object -ExpandProperty TcpTestSucceeded" | tr -d '\r' | grep -qi true) ); then
  export MAIL_TRANSPORT="${MAIL_TRANSPORT:-smtp}"
  export SMTP_HOST="${SMTP_HOST:-localhost}"
  export SMTP_PORT="${SMTP_PORT:-1025}"
  export SMTP_SECURE="${SMTP_SECURE:-false}"
  export VITE_MAIL_VIEW_URL="${VITE_MAIL_VIEW_URL:-http://localhost:8025}"
  say "SMTP local detectado en 1025; usando MailHog (vista: $VITE_MAIL_VIEW_URL)"
else
  say "No se detecta SMTP local en 1025; si MAIL_TRANSPORT=ethereal, se usará vista de preview"
fi

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
  SMTP_HOST="${SMTP_HOST:-}" \
  SMTP_PORT="${SMTP_PORT:-}" \
  SMTP_USER="${SMTP_USER:-}" \
  SMTP_PASS="${SMTP_PASS:-}" \
  SMTP_SECURE="${SMTP_SECURE:-}" \
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
  if ! grep -q "VITE_MAIL_VIEW_URL" "$dir/.env.development" 2>/dev/null && [[ -n "${VITE_MAIL_VIEW_URL}" ]]; then
    echo "VITE_MAIL_VIEW_URL=$VITE_MAIL_VIEW_URL" >> "$dir/.env.development"
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
say "  MongoDB       : mongodb://localhost:27017 (auto: docker wallet-mongo si estaba ausente)"
say "  wallet-db     : http://localhost:${WALLET_DB_PORT}"
say "  wallet-api    : http://localhost:${WALLET_API_PORT}"
say "  client (Vite) : http://localhost:${CLIENT_PORT}"
say "  MailHog (UI)  : http://localhost:8025 (auto si había Docker)"

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
