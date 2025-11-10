Guía rápida: levantar con y sin Docker

Sin Docker (desarrollo local)
- Requisitos: Node 18+, npm, MongoDB local en 27017 sin autenticación.
- Dar permisos y ejecutar:
  - `chmod +x start-all-without-docker.sh`
  - `./start-all-without-docker.sh`
- Variables locales relevantes (`.env.local` en la raíz):
  - `MONGO_URI=mongodb://localhost:27017/walletdb` (sin auth para local)
  - `VITE_API_BASE_URL=http://localhost:3000`
- Endpoints:
  - API proxy: `http://localhost:3000`
  - DB API: `http://localhost:3001`
  - Cliente (Vite): `http://localhost:5173`

Con Docker
- Requisitos: Docker y Docker Compose.
- `docker compose up --build`
- Servicios y red interna:
  - Mongo con auth (usuario/clave desde `.env`)
  - wallet-db: `http://wallet-db:3001`
  - wallet-api: `http://wallet-api:3000`
  - client (Nginx): expuesto en `http://localhost:5173`
- Notas:
  - El cliente se construye con `VITE_API_BASE_URL=http://wallet-api:3000` para resolver dentro de la red de Docker (ajustado en `docker-compose.yml`).
  - Para probar desde host: usa `http://localhost:3000` para el API.

Pruebas rápidas
- Registro:
  - `curl -i -X POST http://localhost:3000/clients/register -H "Content-Type: application/json" -d '{"document":"02900161072","name":"Michael","email":"michael@example.com","phone":"8298657498"}'`
- Recarga:
  - `curl -i -X POST http://localhost:3000/wallet/topup -H "Content-Type: application/json" -d '{"document":"02900161072","phone":"8298657498","amountCents":10000}'`
- Consulta saldo:
  - `curl -s "http://localhost:3000/wallet/balance?document=02900161072&phone=8298657498"`

Solución de problemas
- Error "Command find requires authentication":
  - Asegúrate de usar `MONGO_URI` sin credenciales en local (ya ajustado en `.env.local`).
  - En Docker, Mongo usa autenticación y `wallet-db` se conecta con usuario/clave definidos en `.env`.
