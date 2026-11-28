# Informe final de pruebas — ServiGest

**Entregable:** T-25

**Fecha de verificación:** 28 de noviembre de 2026

**Estado del entregable:** Completado; el equipo confirma que el video de demostración está terminado.

**Alcance:** suites automatizadas, calidad del código, build y comprobaciones de disponibilidad de producción.

## 1. Resumen ejecutivo

La validación local terminó correctamente: **38 pruebas unitarias de backend, 29 de integración y 18 de frontend pasaron**. También pasaron `npm run lint`, `npm run typecheck` y el build de producción de Vite. La integración se ejecutó contra la base `servigest_test` en `localhost:5433`; Prisma encontró cinco migraciones y ninguna pendiente.

En producción, Cloudflare Pages respondió HTTP 200; el health check de Railway respondió HTTP 200 con `status: "ok"` y `db: true`; y la preflight CORS para el origen de Pages respondió HTTP 204 permitiendo el origen esperado. Estas comprobaciones prueban disponibilidad, conexión del backend con su base de datos y configuración CORS, **no** el comportamiento de operaciones transaccionales con datos reales.

Playwright E2E no se ejecutó en esta validación. El repositorio contiene dos flujos E2E y los marca como completados en el backlog, pero necesitan el backend local en el puerto 3000 con datos de `npm run seed:demo`; no forman parte de `npm test`.

## 2. Resultados de ejecución local

| Comprobación | Resultado | Detalle |
|---|---|---|
| `npm test` | **Correcto** | Unitarias backend: 38/38; integración backend: 29/29; frontend: 18/18. En total, 85 pruebas. |
| `npm run lint` | **Correcto** | ESLint del repositorio, sin errores. |
| `npm run typecheck` | **Correcto** | `tsc --noEmit` del frontend, sin errores. |
| `npm run build -w frontend` | **Correcto** | TypeScript y Vite completaron el build en `frontend/dist/`. |
| E2E Playwright | **No ejecutado en esta verificación** | Se ejecuta por separado mediante `npm run test:e2e`; requiere API local y datos demo. |

El comando `npm test` encadena `test:unit`, `test:int` y `test:front`. No incluye `test:e2e`. La suite de integración se conectó a `servigest_test` en `localhost:5433`, aplicó las migraciones existentes y no encontró migraciones pendientes. No se usó la base de producción para estas pruebas.

Durante la generación Prisma mostró una advertencia no bloqueante: la configuración `package.json#prisma` está obsoleta y deberá migrarse a un archivo `prisma.config.ts` antes de Prisma 7.

## 3. Cobertura automatizada

### 3.1 Backend — pruebas unitarias

Los 38 casos unitarios distribuidos en nueve archivos cubren:

| Módulo | Cobertura principal |
|---|---|
| `solicitudesService` | Transiciones válidas, requisitos de resolución y comentarios, permisos por rol y organización, reapertura autorizada, conflictos por versión, asignación apta y justificación de reasignación, filtros de plazo y paginación. |
| `sla` | Cálculo de fecha límite y clasificación de solicitudes abiertas, resueltas y canceladas. |
| `paginacion` | Valores predeterminados, desplazamiento, límites inválidos y máximo permitido. |
| `clientesService`, `tecnicosService`, `catalogosService` | Duplicados y validaciones de RUC/correo/especialidades; restricciones de eliminación por relaciones y disponibilidad de especialidades. |
| `indicadores` | Totales, abiertas, vencidas, por vencer, cumplimiento, promedio, agrupaciones, evolución diaria y resultados vacíos. |
| `notificador` | Entrega al destinatario previsto y cancelación de suscripciones. |
| OpenAPI | Disponibilidad de Swagger UI y del documento OpenAPI YAML. |

Fuentes: [tests unitarios de backend](../backend/tests/unit/), [configuración Vitest de unitarias](../backend/vitest.config.js).

### 3.2 Backend — pruebas de integración

Los 29 casos en cinco archivos levantan la aplicación Express contra PostgreSQL de pruebas y ejercitan endpoints reales:

| Área | Rutas y comportamientos probados |
|---|---|
| Salud y errores HTTP | `GET /api/health`, ruta inexistente `404`, JSON mal formado `400` y restricción única de roles en la base. |
| Autenticación y usuarios | `/api/auth/setup-status`, `/setup`, `/login`, `/me`, `/forgot`, `/reset` y `/logout`; bootstrap de un solo administrador, bootstrap deshabilitado en producción, JWT, respuestas de login neutras, límite de bcrypt, cambio de contraseña temporal, token de recuperación de un solo uso, gestión de usuarios y rate limit de login. |
| Clientes, técnicos y catálogos | CRUD y filtros de `/api/clientes`, `/api/especialidades`, `/api/categorias` y `/api/tecnicos`; duplicados, asignación de especialidades, validaciones y permisos de escritura. |
| Solicitudes | `POST/GET /api/solicitudes`, detalle, `PATCH /estado`, asignación, historial y sedes; ciclo de vida auditado, límites por organización y técnico, validación de sede y control de versión concurrente. |
| Notificaciones | `GET /api/notificaciones`, `PATCH /:id/leida`, `PATCH /leidas` y `/stream`; propiedad, contador de no leídas, marcado y entrega SSE. |
| Dashboard y carga | `GET /api/dashboard/indicadores` y `GET /api/tecnicos/carga`; cálculos desde la base, filtros, validación de fechas y autorización por rol. |
| Adjuntos | Subida, listado y descarga; tipo, tamaño máximo de 5 MB, límite de cinco archivos, permisos y aislamiento entre clientes. |

Fuentes: [tests de integración](../backend/tests/integration/), [configuración Vitest de integración](../backend/vitest.int.config.js) y [setup de migraciones de prueba](../backend/tests/helpers/global-setup.js).

### 3.3 Frontend — pruebas unitarias y de componentes

Los 18 casos en siete archivos cubren:

- Inicio sin sesión y disponibilidad condicional de la configuración del primer Administrador.
- Cliente API: JWT Bearer, errores de validación/duplicados, cierre de sesión y manejo de `401` sin confundirlo con credenciales inválidas en login.
- Cliente de notificaciones: token y análisis de eventos SSE incluso si llegan divididos en fragmentos.
- Validación de adjuntos por tipo permitido, tamaño y cantidad.
- Lista de solicitudes: estado, prioridad, plazo SLA, vista vacía del Técnico y recuperación de errores de API.
- Acciones disponibles por rol/estado, obligatoriedad de comentarios o resolución, prioridad crítica y formato del tiempo restante.
- Conservación del foco al escribir el nombre de una sede en Administración.

Fuentes: [tests del frontend](../frontend/src/) y scripts de [frontend/package.json](../frontend/package.json).

### 3.4 Flujos Playwright E2E

[frontend/e2e/app.spec.ts](../frontend/e2e/app.spec.ts) contiene dos recorridos con frontend, API y base de datos reales:

1. **Registro → asignación → atención:** Cliente crea una solicitud; Coordinador la aprueba y asigna un Técnico apto; el Técnico inicia la atención y documenta la resolución.
2. **Consulta → seguimiento → cierre:** Cliente busca su solicitud; Técnico pide información; Cliente responde; Técnico resuelve; Coordinador cierra; Cliente verifica el estado y el historial.

La configuración de [Playwright](../frontend/playwright.config.ts) inicia o reutiliza el frontend en `localhost:5173`, pero **no** inicia el backend. Para correr E2E se necesita la API local disponible en el puerto 3000 y la semilla demo cargada. El [backlog](tecnico/06-backlog-equipo.md) registra T-23 como hecho; este informe no afirma que Playwright se haya vuelto a ejecutar el 28 de noviembre.

Los dos escenarios no son una cobertura E2E exhaustiva: no automatizan todos los roles, administración de usuarios/catálogos, recuperación de contraseña, carga de adjuntos ni errores de concurrencia.

## 4. Disponibilidad e integración en producción

Se realizaron únicamente solicitudes de lectura y preflight CORS:

| Comprobación | Resultado observado | Qué confirma |
|---|---|---|
| `GET https://servigest-frontend.pages.dev/` | HTTP 200 | La página de Cloudflare Pages está accesible. |
| `GET https://carefree-acceptance-production.up.railway.app/api/health` | HTTP 200; `data.status: "ok"`, `data.db: true` | La API de Railway está disponible y puede conectar con PostgreSQL gestionado en Neon. |
| `OPTIONS /api/solicitudes` con origen de Pages y solicitud POST | HTTP 204; `Access-Control-Allow-Origin` coincide con `https://servigest-frontend.pages.dev`; autoriza `authorization` y `content-type` | La preflight CORS para ese origen, método y cabeceras está permitida. |

Esto es una comprobación de **conectividad y salud**. No se inició sesión, no se crearon ni modificaron solicitudes y no se ejecutaron pruebas transaccionales contra registros reales. `db: true` demuestra conexión a la base desde el health check; no reemplaza pruebas de integridad, escritura, carga o recuperación.

## 5. Brechas, riesgos y diferencias conocidas

### Riesgos operativos y funcionales

- **Recuperación de contraseña:** producción no envía automáticamente correo ni enlace de recuperación. El Administrador debe emitir una contraseña temporal y entregarla por un canal seguro.
- **Persistencia de adjuntos:** se guardan en `backend/uploads/`. No se encontró configuración de volumen persistente para Railway en el repositorio; debe confirmarse la persistencia del servicio antes de depender de conservar archivos después de reinicios o despliegues.
- **SSE con varias instancias:** las conexiones y avisos en vivo se mantienen en memoria por instancia. Con varias instancias, la distribución en tiempo real no está coordinada globalmente; las notificaciones persistidas siguen disponibles al recargar.
- **Cobertura E2E parcial:** existen dos flujos de negocio valiosos, pero no cubren todos los roles, operaciones ni fallos. No deben interpretarse como garantía de ausencia de defectos en los flujos no incluidos.

### Diferencias entre diseño documentado e implementación

- [Mapa UX](ux/02-sitemap.md) marca `/admin` solo para Administrador. La ruta real en [App.tsx](../frontend/src/App.tsx) permite Administrador y Coordinador; las rutas backend de clientes, técnicos, catálogos, dashboard y carga también aceptan ambos roles. `/admin/usuarios` sigue siendo exclusivo del Administrador. Se recomienda alinear la tabla del sitemap con los permisos implementados.
- [Wireframes UX](ux/04-wireframes.md) indican que los filtros de solicitudes se guardan en la URL. [SolicitudesPage](../frontend/src/pages/SolicitudesPage.tsx) inicializa desde `?estado=` y envía los filtros a la API, pero no sincroniza todos los filtros del formulario con la URL. La persistencia/compartición de filtros requiere implementación o ajuste de la especificación.
- `/configurar` existe en la aplicación y se explica en el onboarding, pero no aparece como fila en la tabla de rutas de [02-sitemap.md](ux/02-sitemap.md). Es una omisión documental.
- La documentación de la API indica que no se admite el parámetro `sort`; las listas se ordenan con el comportamiento definido por recurso. Si el diseño requiere ordenamiento seleccionable, debe acordarse e implementarse por separado.

## 6. Seguimiento técnico recomendado (fuera del cierre de T-25)

1. Conservar este informe junto con los [manuales de usuario](manuales/manual-usuario.md) y [operación técnica](manuales/manual-tecnico.md), y sus PDF de entrega.
2. Ejecutar y archivar evidencia adicional de `npm run test:e2e` en un entorno local/staging con base aislada y datos demo; no usar la base de producción para pruebas de escritura.
3. Decidir si se actualiza el diseño/documentación o se implementa la sincronización de filtros con la URL y se corrigen las tablas de rutas.
4. Confirmar una estrategia persistente para adjuntos y correo de recuperación, y evaluar un broker compartido si Railway se escala a varias instancias.

## Fuentes de configuración

- [Scripts raíz](../package.json), [scripts backend](../backend/package.json) y [scripts frontend](../frontend/package.json).
- [Suite E2E](../frontend/e2e/app.spec.ts) y [Playwright config](../frontend/playwright.config.ts).
- [Contrato API](tecnico/04-api.md), [seguridad](tecnico/05-seguridad.md) y [backlog del equipo](tecnico/06-backlog-equipo.md).
