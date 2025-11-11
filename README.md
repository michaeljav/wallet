Guía rápida: levantar con y sin Docker

Con Docker

- Requisitos: Docker y Docker Compose.
- `docker compose up --build`
- Servicios y red interna:
  - Mongo con auth (usuario/clave desde `.env`)
  - wallet-db: `http://wallet-db:3001`
  - wallet-api: `http://wallet-api:3000`
  - client (Nginx): expuesto en `http://localhost:5173`
- Notas:
  - El cliente se construye con `VITE_API_BASE_URL=http://localhost:3000` para resolver dentro de la red de Docker (ajustado en `docker-compose.yml`).
  - Para probar desde host: usa `http://localhost:3000` para el API.
  - Emails de token:
    - Local sin Docker (`MAIL_TRANSPORT=ethereal`): revisa el log de wallet-db y abre la "Email Preview URL".
    - Con Docker (`MAIL_TRANSPORT=smtp` a MailHog): abre http://localhost:8025 para ver el correo.
    - Desarrollo: si `EXPOSE_TOKENS=true`, puedes consultar `GET /payments/dev-token/{sessionId}` para obtener el token temporalmente.

Sin Docker (desarrollo local)

- Requisitos: Node 18+, npm, Docker (opcional para crear Mongo y MailHog autom�ticamente).
- Dar permisos y ejecutar:
  - `chmod +x start-all-without-docker.sh`
  - `./start-all-without-docker.sh`
- Variables locales relevantes (`.env.local` en la ra�z):
  - Modo con autenticaci�n (usa Mongo de docker compose):
    - `MONGO_URI=mongodb://walletroot:walletpass@localhost:27017/walletdb?authSource=admin`
  - Modo sin autenticaci�n (Mongo dev ad-hoc):
    - `MONGO_URI=mongodb://localhost:27017/walletdb`
  - `VITE_API_BASE_URL=http://localhost:3000`
- Endpoints:
  - API proxy: `http://localhost:3000`
  - DB API: `http://localhost:3001`
  - Cliente (Vite): `http://localhost:5173`

Pruebas rápidas

- Registro:
  - `curl -i -X POST http://localhost:3000/clients/register -H "Content-Type: application/json" -d '{"document":"02900161072","name":"Michael","email":"michael@example.com","phone":"8298657498"}'`
- Recarga:
  - `curl -i -X POST http://localhost:3000/wallet/topup -H "Content-Type: application/json" -d '{"document":"02900161072","phone":"8298657498","amountCents":10000}'`
- Consulta saldo:
  - `curl -s "http://localhost:3000/wallet/balance?document=02900161072&phone=8298657498"`

Uso del token (fácil para cualquier usuario)

- En la UI web (cliente):
  - Al iniciar pago, el `sessionId` se autollenará en el formulario de confirmación.
  - Botón "Obtener token (dev)" rellena el `token6` automáticamente cuando `EXPOSE_TOKENS=true`.
  - En Docker puedes ver el correo en MailHog `http://localhost:8025`.

Solución de problemas

- Error "Command find requires authentication":
  - Asegúrate de usar `MONGO_URI` sin credenciales en local (ya ajustado en `.env.local`).
  - En Docker, Mongo usa autenticación y `wallet-db` se conecta con usuario/clave definidos en `.env`.

Más detalles y pasos de prueba: ver `TESTING.md`.

SMTP de desarrollo unificado (MailHog)

- Docker: ya viene `mailhog` en `docker-compose.yml` (puertos 1025 SMTP y 8025 UI).
- Local sin Docker: el script `start-all-without-docker.sh` detecta SMTP en 1025; si tienes Docker, levanta MailHog automáticamente y la UI mostrará “Ver correo”.
- Correos de ejemplo recomendados para registrar usuarios: `user1@wallet.test`, `user2@wallet.test`, `user3@wallet.test` (también aparecen como atajos en el formulario de registro).
- Producción: solo cambia `MAIL_TRANSPORT=smtp` y credenciales `SMTP_HOST/PORT/USER/PASS/SMTP_SECURE`. Desactiva `EXPOSE_TOKENS`.

![Vista previa de la aplicación](images_screens/image.png)
![Vista previa de la aplicación](images_screens/image2.png)
![Vista previa de la aplicación smtp](images_screens/image_smtp_server.png)
![Vista previa de la aplicación smtp](images_screens/image_smtp_server2.png)

![Vista previa de la aplicación mongodb](images_screens/mongodb.png)
![Vista previa de la aplicación mongodb](images_screens/mongodb2.png)

