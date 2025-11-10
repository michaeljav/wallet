Guía de prueba rápida (Docker y local)

Objetivo
- Probar el flujo completo de la billetera: registrar, recargar, iniciar pago (token), confirmar y consultar saldo.
- Misma experiencia con o sin Docker, usando siempre el API proxy `http://localhost:3000`.

Prerrequisitos
- Node.js 18+ y npm (para modo local).
- Docker y Docker Compose (para modo Docker).
- MongoDB local en 27017 si pruebas sin Docker.

Iniciar (elige un método)
- Con Docker:
  - `docker compose up --build`
  - Cliente: `http://localhost:5173`
  - API proxy: `http://localhost:3000`
  - MailHog (correo dev): `http://localhost:8025`
  - Correos de ejemplo para registrar: `user1@wallet.test`, `user2@wallet.test`, `user3@wallet.test`
- Sin Docker:
  - `chmod +x start-all-without-docker.sh`
  - `./start-all-without-docker.sh`
  - Cliente: `http://localhost:5173`
  - API proxy: `http://localhost:3000`
  - Si tienes Docker instalado, el script intentará levantar MailHog para SMTP (1025/8025) y la UI mostrará “Ver correo”.
  - Correos de ejemplo: `user1@wallet.test`, `user2@wallet.test`, `user3@wallet.test`

Verificar salud
- `GET http://localhost:3000/health` → OK
- `GET http://localhost:3001/health` → OK

Probar desde la Web (recomendado)
- Abrir `http://localhost:5173`.
- Registrar cliente (documento, nombre, email, teléfono).
- Recargar saldo (documento, teléfono, amountCents).
- Iniciar pago (documento, teléfono, amountCents):
  - La UI autollenará `sessionId` en “Confirmar pago”.
  - Pulsa “Obtener token (dev)” para llenar `token6` automáticamente.
- Confirmar pago con `sessionId` y `token6`.
- Consultar saldo con documento y teléfono.

Probar vía API (alternativa)
- Usa `request.http` (archivo incluido) o cURL contra `http://localhost:3000`:
  - Registrar: `POST /clients/register`
  - Recargar: `POST /wallet/topup`
  - Iniciar pago: `POST /payments/initiate` → toma `sessionId` de la respuesta.
  - Obtener token (dev): `GET /payments/dev-token/{SESSION_ID}` → toma `token6`.
  - Confirmar: `POST /payments/confirm` con `sessionId` y `token6`.
  - Listar clientes: `GET /clients`

Cómo se envía el token por correo
- En desarrollo no se entrega a buzón real por defecto:
  - Docker: MailHog en `http://localhost:8025` captura el correo.
  - Local: Ethereal genera un “Email Preview URL” (aparece en el log de `wallet-db`).
- Para no depender del correo, está habilitado `EXPOSE_TOKENS=true` que permite `GET /payments/dev-token/{sessionId}` y la UI tiene un botón “Obtener token (dev)”.

Problemas comunes
- “Command find requires authentication”: tu `MONGO_URI` no coincide con tu instancia de Mongo. En local usa `mongodb://localhost:27017/walletdb` o, si usas Mongo de Docker expuesto, `mongodb://walletroot:walletpass@localhost:27017/walletdb?authSource=admin`.
- Status 201 en errores: ya se forzó `@HttpCode(200)`. Si ves 201, reinicia servicios o reconstruye imágenes.
- No veo el correo: usa MailHog (Docker) o abre la “Email Preview URL” en el log (`.logs/wallet-db.log`).

Detener
- Docker: `Ctrl+C` en la terminal o `docker compose down`.
- Local: `Ctrl+C` en la terminal que ejecuta `./start-all-without-docker.sh`.
