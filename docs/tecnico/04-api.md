# Contratos de la API REST

Base: `/api`. Formato JSON. Este documento es la base del archivo `backend/openapi.yaml`, que se publicará en `/api/docs` (Swagger UI) en la semana 2.

## Convenciones

- **Autenticación**: cabecera `Authorization: Bearer <token>` en todo salvo `setup-status`, `setup`, `login`, `forgot` y `reset`.
- **Listas**: `?page=1&limit=10` (máximo 100), más filtros y `?sort=campo` o `?sort=-campo`.

```json
{ "data": [ ... ], "meta": { "page": 1, "limit": 10, "total": 42 } }
```

- **Un recurso**: `{ "data": { ... } }`
- **Error**:

```json
{ "error": { "code": "VALIDACION", "message": "Datos inválidos", "details": [ { "campo": "descripcion", "mensaje": "Es obligatoria" } ] } }
```

| Código | Cuándo |
|---|---|
| 200 / 201 / 204 | Correcto / creado / sin contenido |
| 400 | JSON mal formado o parámetros de consulta inválidos |
| 401 | Sin token, token inválido o vencido |
| 403 | Rol sin permiso para la operación |
| 404 | No existe, o no pertenece al usuario |
| 409 | Duplicado (`DUPLICADO`: correo, RUC o nombre de catálogo ya existe), transición inválida, conflicto de versión, registro en uso |
| 422 | Datos válidos en forma pero rechazados por una regla de negocio o validación de campos |
| 500 | Error inesperado (mensaje genérico; el detalle solo va al log) |

Nunca se devuelve `password_hash`, tokens de restablecimiento ni trazas de error.

## Endpoints

Roles: **A** admin, **C** coordinador, **T** técnico, **L** cliente.

### Autenticación
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/auth/setup-status` | público | Indica si falta crear el primer administrador |
| POST | `/auth/setup` | público, una sola vez | Crea al primer administrador solo si aún no existe ninguno; devuelve JWT e inicia sesión |
| POST | `/auth/login` | público | Inicia sesión con correo y contraseña; error genérico para credenciales inválidas |
| POST | `/auth/logout` | todos | Cierra sesión |
| GET | `/auth/me` | todos | Usuario actual |
| PATCH | `/auth/me` | todos | Edita nombre/teléfono; cambio de contraseña requiere la actual, salvo primer acceso |
| POST | `/auth/forgot` | público | Genera token de restablecimiento; siempre responde 200 |
| POST | `/auth/reset` | público | Cambia la contraseña con un token válido |

`POST /usuarios` (solo A) crea cuentas de administrador o coordinador con contraseña temporal generada; devuelve el valor una sola vez. Las cuentas cliente/técnico se crean desde sus perfiles y también reciben contraseña temporal. `GET /usuarios` admite `page`, `limit`, `q`, `rol` y `activo`; `PATCH /usuarios/:id` actualiza datos, rol permitido y vigencia; `DELETE /usuarios/:id` desactiva sin borrar; `POST /usuarios/:id/restablecer-password` genera una nueva contraseña temporal. Un administrador no puede desactivar su propia cuenta ni cambiar el rol de una cuenta vinculada a un perfil.

No existe auto-registro público. `/auth/setup` solo se habilita en desarrollo y permite crear el primer administrador; el backend serializa la operación y la rechaza con `409 CONFIGURACION_COMPLETADA` si otro administrador ya fue creado. En producción se usa el seed.

Con `debeCambiarPassword: true`, solo se permiten `GET/PATCH /auth/me` y `POST /auth/logout`. Al completar el cambio inicial se libera el acceso.

### Solicitudes
| Método | Ruta | Roles | Descripción | Estado |
|---|---|---|---|---|
| GET | `/solicitudes` | A C T L | Lista paginada, de la más reciente a la más antigua; filtros `estado`, `prioridad`, `categoria`, `cliente`, `tecnico`, `desde`, `hasta` (AAAA-MM-DD) y `q` (código, equipo o descripción). T ve las suyas, L las de su organización | Hecho |
| POST | `/solicitudes` | C L | Registra; C envía `clienteId` | Hecho |
| GET | `/solicitudes/:id` | A C T L | Detalle | Hecho |
| PATCH | `/solicitudes/:id/estado` | A C T L | Cambia estado según la tabla de transiciones | Hecho |
| POST | `/solicitudes/:id/asignaciones` | C | Asigna o reasigna técnico | Hecho |
| GET | `/solicitudes/:id/historial` | A C T L | Auditoría | Hecho |
| GET | `/solicitudes/:id/tecnicos-sugeridos` | C | Técnicos con indicador de si cumplen especialidad, disponibilidad y carga | Pendiente |
| POST | `/solicitudes/:id/adjuntos` | C L | Sube un archivo (multipart) | Pendiente |
| GET | `/solicitudes/:id/adjuntos/:adjuntoId` | A C T L | Descarga | Pendiente |

Pendiente también: el filtro `plazo` y el orden `?sort` en la lista.

Cada solicitud se devuelve con `id`, `codigo`, `estado`, `prioridad`, `prioridadId`, `categoria`, `cliente`, `sede`, `tecnico` (o `null`), `equipo`, `descripcion`, `resolucion`, `fechaLimite`, `estadoPlazo` (`a_tiempo`, `por_vencer`, `vencida`, `cumplida`, `incumplida`, o `null` si está cancelada), `createdAt`, `resolvedAt`, `closedAt` y `version`. `PATCH /estado` exige la `version` que el cliente leyó.

Códigos de error propios del recurso:

| Código | Estado | Cuándo |
|---|---|---|
| `SEDE_INVALIDA` | 422 | La sede no es del cliente o no está vigente |
| `CLIENTE_INACTIVO`, `CATEGORIA_INVALIDA`, `PRIORIDAD_INVALIDA` | 422 | Cliente, categoría o prioridad no vigente |
| `TRANSICION_INVALIDA` | 409 | El cambio no existe en la tabla de transiciones |
| `COMENTARIO_REQUERIDO`, `RESOLUCION_REQUERIDA` | 422 | La transición exige comentario o resolución |
| `CONFLICTO_VERSION` | 409 | Otra persona cambió la solicitud desde que se leyó |
| `ESTADO_NO_ASIGNABLE` | 409 | Se intenta asignar una solicitud registrada, resuelta, cerrada o cancelada |
| `TECNICO_SIN_ESPECIALIDAD`, `TECNICO_NO_DISPONIBLE`, `TECNICO_CARGA_MAXIMA` | 422 | Regla 5 |
| `MISMO_TECNICO`, `JUSTIFICACION_REQUERIDA` | 422 | Reasignación al mismo técnico o sin justificación |

### Catálogos y administración
CRUD con la misma forma: `GET /` (lista paginada, `?q`, `?activo`), `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (409 `EN_USO` si tiene registros relacionados; usar `PATCH` con `activo: false`). `POST` y `PATCH` responden 409 `DUPLICADO` con `details: [{ campo, mensaje }]` si el correo, el RUC o el nombre ya existe.
La comparación de nombres de catálogos no distingue mayúsculas; los nombres repetidos se rechazan también a nivel de base de datos.

| Recurso | Escritura | Lectura |
|---|---|---|
| `/usuarios` | A | A |
| `/clientes` y `/clientes/:id/sedes` | A C | A C (L solo sus sedes) |
| `/tecnicos` | A C | A C |
| `/especialidades` | A C | A C |
| `/categorias` | A C | todos |
| `/prioridades` | A C | todos |

`GET /tecnicos/carga` (A C): técnicos con su carga actual y solicitudes activas.

### Administración: filtros y carga útil

Las listas de clientes, técnicos y catálogos admiten `page`, `limit`, `q` y `activo`.
Los endpoints de escritura de este módulo son accesibles para administrador y
coordinador por decisión del equipo. Todos requieren JWT.

```text
GET|POST                 /clientes
GET|PATCH|DELETE         /clientes/:id
GET|POST                 /tecnicos
GET|PATCH|DELETE         /tecnicos/:id
GET|POST                 /especialidades
GET|PATCH|DELETE         /especialidades/:id
GET|POST                 /categorias
GET|PATCH|DELETE         /categorias/:id
GET|POST                 /prioridades
GET|PATCH|DELETE         /prioridades/:id
```

Al crear un cliente se envían `nombre`, `email`, `telefono`
(opcional), `razonSocial`, `ruc` y al menos una `sede` con `nombre` y
`direccion`; el backend genera una contraseña temporal de un solo uso. Al crear un técnico se envían sus datos de usuario,
`especialidadIds`, `disponible` y `cargaMax` (1 a 20). Las categorías incluyen
`especialidadId`; las prioridades incluyen `horasSla` positiva. Las bajas se
realizan con `PATCH { "activo": false }`; `DELETE` responde `409 EN_USO` si
hay relaciones que impiden el borrado.

### Notificaciones
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/notificaciones` | todos | Lista paginada; `?leida=false` |
| GET | `/notificaciones/stream` | todos | Flujo SSE de notificaciones nuevas |
| PATCH | `/notificaciones/:id/leida` | todos | Marca como leída |
| PATCH | `/notificaciones/leidas` | todos | Marca todas |

### Dashboard
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/dashboard/indicadores` | A C | Filtros `desde`, `hasta`, `tecnico`, `categoria`, `cliente` |

### Sistema
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/docs` | Swagger UI |

## Ejemplos

### POST /api/auth/login
```json
{ "email": "coordinador@servigest.ec", "password": "********" }
```
200:
```json
{ "data": { "token": "eyJ...", "usuario": { "id": 2, "nombre": "María Coordinadora", "email": "coordinador@servigest.ec", "rol": "coordinador", "debeCambiarPassword": false } } }
```
401: `{ "error": { "code": "CREDENCIALES_INVALIDAS", "message": "Correo o contraseña incorrectos" } }`

Con `debeCambiarPassword: true`, cualquier otra ruta responde 403 `{ "error": { "code": "CAMBIO_PASSWORD_REQUERIDO", "message": "Debes cambiar tu contraseña temporal" } }` hasta que se use `PATCH /auth/me`. Ver [onboarding](../ux/07-onboarding.md).

### POST /api/solicitudes
```json
{ "categoriaId": 3, "prioridadId": 2, "sedeId": 5, "equipo": "Switch piso 2", "descripcion": "Sin conectividad desde las 08:00" }
```
201:
```json
{
  "data": {
    "id": 123,
    "codigo": "SOL-2026-000123",
    "estado": "registrada",
    "prioridad": "alta",
    "fechaLimite": "2026-11-12T17:00:00Z",
    "estadoPlazo": "a_tiempo",
    "version": 1
  }
}
```

### PATCH /api/solicitudes/123/estado
```json
{ "estado": "resuelta", "resolucion": "Se reemplazó el puerto dañado y se verificó la conectividad", "version": 4 }
```
- 200: solicitud actualizada.
- 403: el técnico no es el asignado.
- 409 `TRANSICION_INVALIDA`: `{ "error": { "code": "TRANSICION_INVALIDA", "message": "No se puede pasar de asignada a resuelta" } }`
- 409 `CONFLICTO_VERSION`: otro usuario modificó la solicitud.
- 422 `RESOLUCION_REQUERIDA`.

### POST /api/solicitudes/123/asignaciones
```json
{ "tecnicoId": 7, "justificacion": null }
```
- 201: asignación creada, solicitud en `asignada`.
- 422 `TECNICO_SIN_ESPECIALIDAD` | `TECNICO_NO_DISPONIBLE` | `TECNICO_CARGA_MAXIMA` | `JUSTIFICACION_REQUERIDA`.

### GET /api/solicitudes/123/historial
```json
{
  "data": [
    { "id": 901, "estadoAnterior": "aprobada", "estadoNuevo": "asignada", "usuario": "María Coordinadora", "comentario": "Asignada a Juan Pérez", "fecha": "2026-11-12T10:20:00Z" }
  ]
}
```

### GET /api/dashboard/indicadores?desde=2026-11-01&hasta=2026-11-30
```json
{
  "data": {
    "total": 40,
    "porEstado": [ { "estado": "en_proceso", "cantidad": 9 } ],
    "porPrioridad": [ { "prioridad": "alta", "cantidad": 12 } ],
    "cargaPorTecnico": [ { "tecnico": "Juan Pérez", "activas": 3, "cargaMax": 5 } ],
    "tiempoPromedioResolucionHoras": 14.5,
    "cumplimientoPlazo": 0.82,
    "vencidas": 4,
    "porVencer": 3,
    "evolucion": [ { "fecha": "2026-11-10", "creadas": 5, "resueltas": 3 } ]
  }
}
```

### SSE — GET /api/notificaciones/stream
```
event: notificacion
data: {"id":55,"tipo":"asignacion","mensaje":"Te asignaron SOL-2026-000123","solicitudId":123}
```
`EventSource` no permite cabeceras, así que el frontend lee el flujo con `fetch` para poder enviar `Authorization`.
