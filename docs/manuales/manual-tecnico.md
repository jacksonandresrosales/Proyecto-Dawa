# Manual técnico de instalación, despliegue y operación

**Sistema:** ServiGest

**Versión:** 1.0
**Estado:** guía operativa basada en la configuración del repositorio y el despliegue actual.

## 1. Arquitectura y servicios

| Componente | Tecnología y ubicación | Dirección |
|---|---|---|
| Frontend | React + TypeScript + Vite; Cloudflare Pages | [servigest-frontend.pages.dev](https://servigest-frontend.pages.dev/) |
| API | Node.js + Express; Railway | [carefree-acceptance-production.up.railway.app](https://carefree-acceptance-production.up.railway.app/) |
| Base de datos | PostgreSQL gestionado; Neon | La URL de conexión se configura como secreto en Railway |

El frontend sirve la SPA y llama a la API mediante `VITE_API_URL`. El backend valida permisos, ejecuta reglas de negocio y accede a PostgreSQL con Prisma. El frontend no se conecta directamente a la base de datos.

Endpoints útiles:

- Health check — [https://carefree-acceptance-production.up.railway.app/api/health](https://carefree-acceptance-production.up.railway.app/api/health)
- Swagger UI — [https://carefree-acceptance-production.up.railway.app/api/docs](https://carefree-acceptance-production.up.railway.app/api/docs)
- Contrato OpenAPI — [https://carefree-acceptance-production.up.railway.app/api/openapi.yaml](https://carefree-acceptance-production.up.railway.app/api/openapi.yaml)

La arquitectura detallada, el esquema de datos y los contratos se describen en [01-arquitectura.md](../tecnico/01-arquitectura.md), [02-modelo-datos.md](../tecnico/02-modelo-datos.md) y [04-api.md](../tecnico/04-api.md).

## 2. Requisitos y configuración

- Node.js 22 o superior y npm.
- Docker Desktop para PostgreSQL local y pruebas de integración.
- Acceso a Railway, Neon y Cloudflare para tareas de producción.
- Wrangler CLI para publicar el frontend; se invoca mediante `npx`.

### Variables de entorno

| Variable | Servicio | Uso y requisito |
|---|---|---|
| `DATABASE_URL` | Backend | URL PostgreSQL de desarrollo o Neon. Es secreta. |
| `JWT_SECRET` | Backend | Firma JWT; mínimo 32 caracteres aleatorios. Es secreta. |
| `JWT_EXPIRES_IN` | Backend | Duración del JWT; si se omite, el backend usa `8h`. |
| `CORS_ORIGIN` | Backend | Origen exacto permitido, sin rutas; por ejemplo `http://localhost:5173` o `https://servigest-frontend.pages.dev`. |
| `PORT` | Backend | Puerto HTTP; se usa `3000` por defecto y Railway puede inyectar el suyo. |
| `VITE_API_URL` | Frontend | URL base de la API **incluyendo `/api`**, por ejemplo `https://carefree-acceptance-production.up.railway.app/api`. Se incorpora durante el build. |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Bootstrap | Opcionales para crear la primera cuenta Administrador con `npm run seed`. Tratar ambos como secretos. |

Los ejemplos están en `backend/.env.example` y `frontend/.env.example`. Copia los ejemplos a archivos locales y cambia sus valores antes de iniciar la app. En PowerShell:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\frontend\.env.example .\frontend\.env
```

`.env`, `.env.*` y `backend/uploads/` están ignorados por Git; `.env.example` está permitido. No agregues secretos a archivos versionados, logs o documentación. Para Cloudflare Pages configura `VITE_API_URL` en las variables de entorno del proyecto; editar `.env.production` local no configura el proveedor ni debe subirse al repositorio.

## 3. Instalación y ejecución local

Desde la raíz del repositorio:

```powershell
docker compose up -d
npm install
```

Configura `backend/.env` y `frontend/.env`. Para desarrollo, `backend/.env.example` apunta a PostgreSQL en `localhost:5432` y el frontend de ejemplo a `http://localhost:3000/api`.

Aplica migraciones de desarrollo:

```powershell
npm run migrate
```

Este comando ejecuta `prisma migrate dev`; úsalo en desarrollo para aplicar y crear migraciones. No lo uses como comando de migración de producción.

En dos terminales, inicia API y frontend:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Direcciones locales:

- App: `http://localhost:5173`
- API health: `http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/api/docs`
- Configuración inicial: `http://localhost:5173/configurar`, solo si aún no existe un Administrador y el entorno permite el bootstrap.

La API valida que existan `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres) y `CORS_ORIGIN`. `PORT` tiene un valor por defecto.

## 4. Base de datos, migraciones y datos iniciales

Docker Compose define dos bases:

| Servicio | Puerto del host | Uso |
|---|---:|---|
| `db` | 5432 | Desarrollo local; persiste en el volumen `db_data`. |
| `db_test` | 5433 | Pruebas de integración; base `servigest_test`. |

Para comprobar los contenedores:

```powershell
docker compose ps
```

`npm run seed` crea los roles, estados y prioridades base. Si se definen `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD` en el entorno, crea también la cuenta inicial, que debe cambiar la contraseña al ingresar. Si no se crea desde el seed, en desarrollo se puede usar `/configurar` mientras no exista un Administrador.

`npm run seed:demo` agrega usuarios y solicitudes ficticias para desarrollo, pruebas manuales y E2E. No lo ejecutes con datos reales: usa credenciales de demostración y el script se bloquea cuando `NODE_ENV=production`.

### Migraciones de producción

1. Revisa los archivos nuevos de `backend/prisma/migrations/` y confirma que la migración es compatible con la versión que está en producción.
2. Verifica que exista un respaldo recuperable de Neon antes de cambios de esquema.
3. En el entorno aprobado que tenga el `DATABASE_URL` de producción, ejecuta una sola vez:

   ```powershell
   Set-Location .\backend
   npx prisma migrate deploy
   ```

4. Comprueba que las migraciones aparecen aplicadas y que `/api/health` devuelve `200` con `db: true`.

`prisma migrate deploy` aplica migraciones existentes; no crea migraciones nuevas. No incluyas la URL de Neon en argumentos, historial de comandos, logs o tickets. La configuración de ejecución de Railway debe proporcionar las variables del servicio. El repositorio no contiene una configuración de despliegue como código que ejecute este paso automáticamente.

## 5. Pruebas y verificaciones de calidad

| Comando | Alcance | Requisitos |
|---|---|---|
| `npm run test:unit` | Unitarias del backend | No requiere PostgreSQL. |
| `npm run test:int` | Integración del backend | `db_test` activo en `localhost:5433`; el setup aplica migraciones. |
| `npm run test:front` | Pruebas de componentes frontend | Dependencias instaladas. |
| `npm test` | Unitarias + integración + frontend | Requiere `db_test` activo. |
| `npm run test:e2e` | Flujos Playwright del frontend | API local disponible y datos de `npm run seed:demo`; instalar Chromium una vez con `npx playwright install chromium`. |
| `npm run lint` | ESLint del repositorio | Dependencias instaladas. |
| `npm run typecheck` | TypeScript del frontend | Dependencias instaladas. |
| `npm run build` desde `frontend/` | Typecheck y build Vite en `frontend/dist/` | `VITE_API_URL` correcto para el ambiente de destino. |

Para levantar solo la base de integración:

```powershell
docker compose up -d db_test
npm run test:int
```

## 6. Despliegue

No hay archivos `wrangler.*`, configuración `railway.*` ni workflow de despliegue versionados en el repositorio. Confirma la configuración vigente de los proyectos en los paneles de cada proveedor. El frontend se publica con Wrangler; la configuración de build y arranque del backend se administra en el servicio de Railway.

### API en Railway

Configura en el servicio de Railway:

- Variables `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` y `CORS_ORIGIN`; Railway proporciona `PORT`.
- `CORS_ORIGIN` debe coincidir exactamente con `https://servigest-frontend.pages.dev`.
- Para iniciar desde la raíz del monorepo, el comando disponible es `npm run start -w backend`. Si Railway usa `backend/` como directorio de trabajo, el comando del workspace es `npm start`.
- Antes de poner en servicio una versión con cambios de esquema, aplica `npx prisma migrate deploy` contra la base de producción, siguiendo el procedimiento anterior.

No ejecutes `npm run seed:demo` en Railway ni copies archivos `.env` al despliegue. Para bootstrap inicial, define las variables `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD` como secretos y ejecuta el seed base desde el entorno autorizado.

### Frontend en Cloudflare Pages con Wrangler

`VITE_API_URL` se incorpora al bundle en tiempo de build. Para un despliegue directo con Wrangler, configúrala en el entorno local de PowerShell o en el archivo ignorado `frontend/.env.production` antes de compilar. Las variables del panel de Pages se aplican a los builds ejecutados por Pages; no cambian un `dist/` ya compilado en tu equipo.

```powershell
Set-Location .\frontend
$env:VITE_API_URL = 'https://carefree-acceptance-production.up.railway.app/api'
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name=servigest-frontend
```

Si el build se ejecuta en Cloudflare Pages desde un repositorio conectado, configura allí `VITE_API_URL` y establece el directorio raíz, el comando de build y `dist` como directorio de salida del proyecto. No se encontró una configuración de Pages como código versionada en el repositorio.

`frontend/public/_redirects` contiene la regla SPA `/*    /index.html   200`, necesaria para que las rutas de React Router funcionen al recargar. Comprueba que permanezca incluida en `dist/` después del build.

### Orden y validación posterior

1. Revisa cambios, pruebas, variables y migraciones; realiza el respaldo previsto.
2. Aplica migraciones compatibles y despliega la API.
3. Confirma el health check de la API y su conexión con Neon.
4. Compila y publica el frontend con la URL correcta de API.
5. Abre la app, inicia sesión con una cuenta de prueba aprobada y confirma navegación y llamadas principales.
6. Comprueba una ruta interna después de recargarla y revisa que no haya errores CORS en el navegador.

URLs de producción:

- App: [https://servigest-frontend.pages.dev/](https://servigest-frontend.pages.dev/)
- API health: [https://carefree-acceptance-production.up.railway.app/api/health](https://carefree-acceptance-production.up.railway.app/api/health)

No hagas pruebas que creen o cambien registros reales sin autorización.

## 7. Operación, respaldo y recuperación

- **API:** supervisa estado, logs y despliegues en Railway. El health check consulta PostgreSQL y responde `503` si no puede conectar; un `200` debe incluir `status: "ok"` y `db: true`.
- **Base de datos:** vigila disponibilidad y respaldos desde Neon. El repositorio no configura una política de backup ni restauración; verifica que el proyecto tenga una y prueba la recuperación antes de depender de ella.
- **Frontend:** conserva el último despliegue bueno de Cloudflare Pages para restaurarlo desde el panel si una publicación falla. Comprueba también `VITE_API_URL` y el origen CORS.
- **Migraciones:** el rollback de código no revierte automáticamente cambios de esquema. Usa migraciones correctivas compatibles y el procedimiento de recuperación de Neon; no borres tablas o volúmenes como método de rollback.
- **Logs y soporte:** no copies JWT, contraseñas, URLs con credenciales ni datos personales de clientes en incidencias o logs.

### Limitaciones operativas que deben tenerse presentes

1. Los adjuntos se guardan en `backend/uploads/` en el sistema de archivos local del backend. El repositorio no contiene una configuración de volumen persistente para Railway; confirma que exista almacenamiento persistente antes de depender de la conservación de archivos entre despliegues o reinicios.
2. Los avisos en vivo SSE se distribuyen en memoria dentro de una instancia. Con varias instancias, la distribución puede no ser global; las notificaciones persistidas siguen disponibles al recargar.
3. La recuperación de contraseña no envía correo. Para producción, el Administrador genera y entrega una contraseña temporal por un canal seguro.

## 8. Diagnóstico rápido

| Síntoma | Comprobaciones |
|---|---|
| Frontend indica que no puede conectar con la API | Confirma que `VITE_API_URL` se definió antes del build y termina en `/api`; publica de nuevo después de corregirlo. |
| Error CORS | Confirma que `CORS_ORIGIN` contiene el origen exacto del frontend, sin ruta ni barra final; el origen local debe coincidir también (`localhost` y `127.0.0.1` son distintos). |
| Health check responde `503` o `db: false` | Revisa disponibilidad de Neon y `DATABASE_URL` configurada en Railway; no imprimas el valor en logs. |
| Backend no inicia | Revisa los nombres de variables requeridos y los logs de Railway. `JWT_SECRET` debe tener al menos 32 caracteres. |
| Error de Prisma al integrar local | Inicia `db_test` y verifica el puerto `5433`; no apuntes la suite de integración a la base de desarrollo o producción. |
| Recargar una ruta interna devuelve 404 | Comprueba que `frontend/public/_redirects` se copió a `dist/` y vuelve a publicar Pages. |
| Adjuntos dejan de estar disponibles tras un reinicio o despliegue | Verifica persistencia de `backend/uploads/` en Railway y el respaldo de archivos; los metadatos de PostgreSQL por sí solos no contienen el archivo. |

## Documentación relacionada

- [Manual de usuario](manual-usuario.md)
- [Arquitectura](../tecnico/01-arquitectura.md)
- [Modelo de datos](../tecnico/02-modelo-datos.md)
- [Reglas de negocio](../tecnico/03-estados-y-reglas.md)
- [Contrato API](../tecnico/04-api.md)
- [Seguridad](../tecnico/05-seguridad.md)
