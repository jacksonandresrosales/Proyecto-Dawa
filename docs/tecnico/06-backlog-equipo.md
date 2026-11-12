# Backlog, equipo y plan

## Reparto

Cada integrante es dueño de un módulo completo (base de datos, API, pantallas y pruebas), para que todos puedan defender frontend y backend.

| Integrante | Módulo | Backend | Frontend |
|---|---|---|---|
| **A** — _nombre_ | Seguridad y usuarios | auth, JWT, roles, restablecimiento, CRUD usuarios, `errorHandler`, `validate` | Login, recuperar, perfil, `ProtectedRoute`, `AppShell`, `useAuth` |
| **B** — _nombre_ | Clientes, técnicos y catálogos | CRUD clientes, sedes, técnicos, especialidades, categorías, prioridades; borrado restringido | Plantilla admin, `DataTable`, `FilterBar`, `Pagination`, `ConfirmDialog` |
| **C** — _nombre_ | Solicitudes | Registro, lista con filtros, detalle, máquina de estados, historial, adjuntos | Lista, nueva solicitud, detalle, `StatusBadge`, `HistoryTimeline`, `StateActionButtons` |
| **D** — _nombre_ | Asignación, seguimiento, avisos y dashboard | Asignación, SLA, notificaciones SSE, indicadores | Modal asignar, tablero de carga, campana, dashboard, `SlaIndicator` |

Compartido: modelo de datos y datos semilla (todos, semana 1), OpenAPI (cada uno documenta sus endpoints), pruebas E2E (C y D), despliegue (A y B), manuales y video (todos).

## Plan de cinco semanas

| Semana | Hito | A | B | C | D |
|---|---|---|---|---|---|
| 1 | Diseño y backlog aprobados | Arquitectura, seguridad | Modelo de datos | Estados y reglas, flujos | API, wireframes |
| 2 | Backend, autenticación y API | Auth + usuarios | CRUD catálogos | Solicitudes + estados | Asignación + SLA |
| 3 | Frontend integrado | Login, layout, rutas | Pantallas admin | Lista, formulario, detalle | Modal asignar, carga |
| 4 | Reglas avanzadas, avisos, dashboard | Restablecimiento, perfil | Vigencias y restricciones | Adjuntos, reapertura | SSE, dashboard |
| 5 | Pruebas, despliegue, documentación | Despliegue | Manual técnico | E2E, informe de pruebas | Manual de usuario, video |

Revisiones formativas: fin de semana 2 (arquitectura y API) y fin de semana 4 (integración y reglas).

## Backlog inicial

| ID | Tarea | Historias | Dueño | Semana |
|---|---|---|---|---|
| T-01 | Esquema Prisma, migración inicial y trigger de historial | – | Todos | 1–2 |
| T-02 | Datos semilla | – | B | 2 |
| T-03 | Login, `auth`, `requireRole`, `errorHandler` | HU-01, 02 | A | 2 |
| T-04 | CRUD usuarios | HU-40 | A | 2 |
| T-05 | CRUD clientes y sedes | HU-41 | B | 2 |
| T-06 | CRUD técnicos y especialidades | HU-42 | B | 2 |
| T-07 | CRUD categorías y prioridades | HU-43 | B | 2 |
| T-08 | Registrar y listar solicitudes con filtros y paginación | HU-10, 11, 20, 30 | C | 2 |
| T-09 | Cambio de estado con tabla de transiciones e historial | HU-13, 15, 21, 25, 26, 31–34 | C | 2 |
| T-10 | Asignación y reasignación con validaciones | HU-22, 23 | D | 2 |
| T-11 | Cálculo de plazos y estado del plazo | HU-24 | D | 2 |
| T-12 | OpenAPI y Swagger UI | – | Todos | 2 |
| T-13 | Layout, rutas protegidas, login | HU-01, 02 | A | 3 |
| T-14 | Pantallas de administración | HU-40–43 | B | 3 |
| T-15 | Lista, nueva solicitud y detalle | HU-10–13 | C | 3 |
| T-16 | Modal asignar y tablero de carga | HU-22, 23, 27 | D | 3 |
| T-17 | Restablecimiento de contraseña y perfil | HU-03, 04 | A | 4 |
| T-18 | Adjuntos | HU-10 | C | 4 |
| T-19 | Notificaciones y SSE | HU-14 | D | 4 |
| T-20 | Dashboard | HU-28, 44 | D | 4 |
| T-21 | Pruebas unitarias de reglas 1, 2, 4, 5, 6 | – | C, D | 2–4 |
| T-22 | Pruebas de integración y de autorización por rol | – | Cada dueño | 2–4 |
| T-23 | E2E: registro–asignación–atención y consulta–seguimiento–cierre | – | C, D | 5 |
| T-24 | Despliegue | – | A, B | 5 |
| T-25 | Manuales, informe de pruebas, video | – | Todos | 5 |

## Checklist del enunciado

| Sección | Requisito | Dónde queda cubierto |
|---|---|---|
| 4 | Arquitectura en capas; el frontend no toca la BD | `01-arquitectura.md` |
| 4 | React funcional, Hooks, rutas protegidas, formularios validados, responsivo | `ux/04`, `ux/05` |
| 4 | Express; lógica crítica en servidor | `01-arquitectura.md`, `03-estados-y-reglas.md` |
| 4 | REST, JSON, códigos HTTP, errores centralizados, paginación, filtros | `04-api.md` |
| 4 | PostgreSQL con claves, restricciones, índices, migraciones | `02-modelo-datos.md` |
| 4 | Hash, autenticación, roles, secretos | `05-seguridad.md` |
| 4 | Git con aportes verificables; configuración por ambiente | `CONTRIBUTING.md`, `01-arquitectura.md` |
| 4 | OpenAPI y guía de ejecución | T-12, `README.md` |
| 5.1 | Autenticación, cierre de sesión, restablecimiento, perfiles, 4 roles | HU-01–04, `05-seguridad.md` |
| 5.2 | CRUD con duplicidad, integridad, vigencia, restricción al eliminar | HU-40–43, `02-modelo-datos.md` |
| 5.3 | Solicitud con código, categoría, prioridad, descripción, sede, equipo, adjuntos; 8 estados; historial inalterable | `02-modelo-datos.md`, `03-estados-y-reglas.md` |
| 5.4 | Asignación y reasignación justificada; plazos; por vencer; registro de transiciones | `03-estados-y-reglas.md` |
| 5.5 | Notificaciones y actualización sin recarga | SSE, `04-api.md` |
| 5.6 | Dashboard con datos reales y filtros por rol | `04-api.md`, `ux/04` |
| 6 | Ocho reglas de negocio | Tabla en `03-estados-y-reglas.md` |
| 7 | Ocho endpoints mínimos | `04-api.md` |
| 8 | Entidades mínimas, diagramas lógico y físico, datos de prueba | `02-modelo-datos.md` |
| 8 | Unitarias (≥5 reglas), integración, 2 E2E, autorización, entradas inválidas | T-21, T-22, T-23 |
| 8 | Estados de carga, error y vacío; responsivo | `ux/04`, `ux/05` |
| 9 | Manuales, informe de pruebas, despliegue, video | Semana 5 |
