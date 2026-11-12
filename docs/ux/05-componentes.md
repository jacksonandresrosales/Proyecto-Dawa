# Inventario de componentes

Componentes funcionales de React con Hooks, en TypeScript (`.tsx`), armados sobre shadcn/ui (ver [Base: shadcn/ui](#base-shadcnui)). Carpeta prevista: `frontend/src/components/<grupo>/`.

## Layout

| Componente | Props principales | Qué hace | Pantallas |
|---|---|---|---|
| `AppShell` | `children` | Menú lateral + barra superior + área de contenido | Todas con sesión |
| `Sidebar` | `rol` | Enlaces según rol; se pliega en móvil | Todas con sesión |
| `Topbar` | `titulo` | Título, campana, menú de usuario | Todas con sesión |
| `NotificationBell` | – | Contador en vivo (SSE) y lista corta | Todas con sesión |
| `ProtectedRoute` | `roles` | Exige sesión y rol; redirige a `/login` o `/inicio` | Rutas privadas |

## Datos

| Componente | Props principales | Qué hace | Pantallas |
|---|---|---|---|
| `DataTable` | `columnas`, `filas`, `cargando`, `error`, `onReintentar` | Tabla con estados de carga, vacío y error; tarjetas en móvil | Listas, admin, dashboard |
| `FilterBar` | `filtros`, `valores`, `onCambio` | Búsqueda y selectores; sincroniza con la URL | Listas, admin |
| `Pagination` | `pagina`, `total`, `limite`, `onCambio` | Paginación | Listas, admin |
| `EmptyState` | `titulo`, `accion` | Mensaje de ausencia de datos | Dentro de `DataTable` |
| `LoadingSkeleton` | `filas` | Marcador de carga | Dentro de `DataTable` y tarjetas |
| `ErrorState` | `mensaje`, `onReintentar` | Error con botón de reintento | Dentro de `DataTable` y tarjetas |

## Dominio

| Componente | Props principales | Variantes | Pantallas |
|---|---|---|---|
| `StatusBadge` | `estado` | registrada, aprobada, asignada, en proceso, pendiente de información, resuelta, cerrada, cancelada | Lista, detalle, inicio |
| `PriorityBadge` | `prioridad` | baja, media, alta, crítica | Lista, detalle |
| `SlaIndicator` | `fechaLimite`, `estadoPlazo` | a tiempo, por vencer, vencida, cumplida, incumplida | Lista, detalle, inicio |
| `HistoryTimeline` | `eventos` | cambio de estado, asignación, comentario | Detalle |
| `StateActionButtons` | `solicitud`, `rol`, `onAccion` | Botones permitidos para ese rol y estado | Detalle |
| `AssignTechnicianModal` | `solicitudId`, `esReasignacion`, `onAsignado` | asignar, reasignar (justificación obligatoria) | Detalle |
| `TechnicianLoadBar` | `actual`, `maximo` | normal, casi lleno, lleno | Modal asignar, tablero de carga, dashboard |
| `RequestForm` | `clientes?`, `onGuardado` | cliente, coordinador (con selector de cliente) | Nueva solicitud |
| `AttachmentUploader` | `archivos`, `onCambio` | Valida tipo y tamaño | Nueva solicitud |

El texto de `SlaIndicator` (a tiempo, por vencer, vencida) lo calcula el servidor; el componente solo lo muestra.

## Dashboard

| Componente | Props principales | Qué hace |
|---|---|---|
| `KpiCard` | `titulo`, `valor`, `enlace?` | Indicador numérico |
| `ChartCard` | `titulo`, `tipo`, `datos` | Gráfico de barras o líneas con estados de carga, vacío y error |
| `DateRangeFilter` | `desde`, `hasta`, `onCambio` | Rango de fechas con atajos (7 días, 30 días, este mes) |

## Formularios y avisos

| Componente | Props principales | Qué hace |
|---|---|---|
| `FormField` | `label`, `error`, `children` | Etiqueta, control y mensaje de error accesibles |
| `ConfirmDialog` | `titulo`, `requiereTexto`, `onConfirmar` | Confirmación; con `requiereTexto` exige motivo o justificación |
| `Toast` | `tipo`, `mensaje` | Aviso breve de éxito o error |

## Hooks previstos

| Hook | Qué hace |
|---|---|
| `useAuth` | Usuario actual, rol, `login`, `logout` |
| `useApi` | Petición con estados `cargando`, `error`, `datos` y reintento |
| `useNotificaciones` | Conexión SSE, contador y lista |
| `useFiltrosUrl` | Lee y escribe filtros y página en la URL |

## Base: shadcn/ui

Los componentes de esta lista no se construyen desde cero: se arman con piezas de [shadcn/ui](https://ui.shadcn.com/) (Radix + Tailwind). shadcn no es una dependencia cerrada: copia el código a `frontend/src/components/ui/`, así que el equipo puede leerlo y explicarlo en la defensa.

- Agregar una pieza: `npx shadcn@latest add <pieza>` dentro de `frontend/`.
- `components/ui/` es código generado: no se edita a mano salvo necesidad y ESLint lo ignora.
- Los componentes propios van en `components/<grupo>/` e importan con el alias `@/components/ui/...`.

| Componente propio | Piezas de shadcn |
|---|---|
| `AppShell`, `Sidebar` | `sidebar` |
| `Topbar` | `dropdown-menu`, `avatar` |
| `NotificationBell` | `popover`, `badge`, `button` |
| `DataTable` | `table` |
| `FilterBar` | `input`, `select` |
| `Pagination` | `pagination` |
| `LoadingSkeleton` | `skeleton` |
| `EmptyState` | `empty` |
| `ErrorState` | `alert`, `button` |
| `StatusBadge`, `PriorityBadge`, `SlaIndicator` | `badge` |
| `StateActionButtons` | `button` |
| `AssignTechnicianModal` | `dialog`, `textarea` |
| `TechnicianLoadBar` | `progress` |
| `RequestForm`, `FormField` | `field`, `input`, `select`, `textarea`, `button` |
| `KpiCard` | `card` |
| `ChartCard` | `card`, `chart` (Recharts) |
| `DateRangeFilter` | `popover`, `calendar` |
| `ConfirmDialog` | `alert-dialog` |
| `Toast` | `sonner` |
| Pantallas de admin | `tabs` |

Sin pieza de shadcn (se escriben a mano): `ProtectedRoute`, `HistoryTimeline`, `AttachmentUploader` y los hooks.

Instaladas hoy: `button` y `card`. El resto se agrega cuando se construya la pantalla que lo usa.
