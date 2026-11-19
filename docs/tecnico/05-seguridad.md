# Seguridad

## Autenticación

- Contraseñas guardadas con **bcrypt** (costo 10). Entre 8 y 72 bytes, con al menos una letra y un número.
- `POST /auth/login` devuelve un **JWT** firmado con `JWT_SECRET`, con `sub` (id del usuario), `rol` y expiración de 8 horas.
- El frontend guarda el token en memoria y en `sessionStorage` con la clave `servigest_token`, y lo envía en `Authorization: Bearer`.
- Cierre de sesión: el frontend descarta el token; el endpoint no mantiene sesiones en servidor. El middleware `auth` consulta en cada petición que el usuario siga activo, así que desactivar un usuario corta su acceso de inmediato.
- El mensaje de error del login es el mismo para "correo no existe" y "contraseña incorrecta".
- Límite de intentos en `/auth/login` y `/auth/forgot` (`express-rate-limit`).
- `helmet` agrega cabeceras seguras y CORS admite solo `CORS_ORIGIN`.
- En desarrollo, la primera cuenta se crea desde `/configurar` solo si aún no existe ningún administrador. La configuración inicial crea los cuatro roles y el administrador elige su propia contraseña; el endpoint rechaza nuevas altas en cuanto existe un administrador. En producción, este bootstrap público está deshabilitado. No hay registro público para cuentas adicionales.
- `npm run seed` crea los cuatro roles y puede crear un administrador si se definen `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD`; es el mecanismo de bootstrap para producción.

## Restablecimiento de contraseña

1. `POST /auth/forgot` con el correo. Siempre responde 200 con el mismo mensaje.
2. Si el usuario existe, se genera un token aleatorio de 32 bytes; en la base se guarda solo su SHA-256, con expiración de 30 minutos.
3. `POST /auth/reset` con token y nueva contraseña: valida que exista, no esté usado ni vencido; cambia la contraseña y marca el token como usado.

Decisión: no se envía correo. En desarrollo el enlace se escribe en el log del servidor. El administrador puede generar una contraseña temporal desde gestión de usuarios y entregarla al usuario; su siguiente acceso exige cambiarla.

## Autorización

Dos niveles, ambos en el servidor:

| Nivel | Dónde | Ejemplo |
|---|---|---|
| Por rol | Middleware `requireRole('admin', 'coordinador')` en la ruta | Solo el coordinador puede asignar |
| Por pertenencia | Servicio o repositorio | El cliente solo ve sus solicitudes; el técnico solo modifica las asignadas a él |

El frontend oculta menús y botones según el rol, pero eso es comodidad: la protección real está en la API. Un recurso ajeno responde 404 para no revelar que existe.

## Validación de entrada

- Cada endpoint tiene un esquema **Zod** para `body`, `params` y `query`; los campos no declarados se descartan.
- Prisma usa consultas parametrizadas (sin concatenar SQL).
- Las contraseñas temporales se muestran únicamente en la respuesta de creación/restablecimiento; nunca se guardan ni se listan en texto plano.
- Adjuntos: tipos permitidos (PDF, JPG, PNG), máximo 5 MB, nombre de archivo generado por el servidor, guardados fuera de la carpeta pública y servidos solo por un endpoint con permisos.

## Cabeceras y CORS

- `helmet` para cabeceras de seguridad.
- CORS limitado al origen del frontend (`CORS_ORIGIN`).

## Secretos y configuración

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de tokens |
| `JWT_EXPIRES_IN` | Duración del token |
| `CORS_ORIGIN` | Origen permitido |
| `PORT` | Puerto del backend |
| `VITE_API_URL` | URL de la API para el frontend |

- `.env` está en `.gitignore`; `.env.example` lleva los nombres y valores de ejemplo sin secretos reales.
- El backend valida las variables al arrancar y se detiene si falta alguna.
- En producción las variables se definen en el proveedor de despliegue.

## Datos sensibles y errores

- Las respuestas nunca incluyen `password_hash` ni tokens.
- El `errorHandler` devuelve mensajes útiles para errores esperados y un mensaje genérico para los inesperados; la traza solo se registra en el servidor.

## Auditoría

- `historial_estados` registra usuario, fecha y cambio de cada transición, y un trigger impide editar o borrar filas.
- `asignaciones` conserva todas las asignaciones anteriores con quién las hizo y la justificación.
