# Wireframes — estructura de cada pantalla

Baja fidelidad: definen qué hay en cada pantalla y dónde, no colores ni tipografía. Los diseños están en Figma y en un prototipo navegable (enlaces al final).

Todas las pantallas con datos tienen tres estados además del normal: **cargando** (esqueleto), **vacío** (mensaje + acción sugerida) y **error** (mensaje + reintentar).

## Layout base (todas las pantallas con sesión)

```
┌──────────┬─────────────────────────────────────────────┐
│ Logo     │ Título de la página        🔔 3   Nombre ▾  │
│          ├─────────────────────────────────────────────┤
│ Inicio   │                                             │
│ Solicit. │              Contenido                      │
│ Dashboard│                                             │
│ Carga    │                                             │
│ Admin ▸  │                                             │
└──────────┴─────────────────────────────────────────────┘
```

- Menú lateral con las secciones del rol. En móvil se vuelve un menú desplegable.
- Campana con contador en vivo; al pulsar, lista de las últimas notificaciones y enlace a "Ver todas".
- Menú de usuario: Perfil, Cerrar sesión.

Componentes: `AppShell`, `Sidebar`, `Topbar`, `NotificationBell`.

## 1. Login — `/login`

- Tarjeta centrada: logo, correo, contraseña, botón Ingresar, enlace "Olvidé mi contraseña".
- Error de credenciales sobre el formulario; botón deshabilitado mientras envía.

Componentes: `FormField`.

## 2. Recuperar / Restablecer — `/recuperar`, `/restablecer/:token`

- Recuperar: correo + Enviar; luego mensaje neutro.
- Restablecer: nueva contraseña + confirmación; mensaje si el enlace no sirve.

## 2b. Primer acceso — `/primer-acceso`

- Tarjeta centrada como el login: saludo con nombre y rol, una línea de qué hará en la app, nueva contraseña + confirmación con la regla visible, botón **Guardar y entrar**. Detalle en [07-onboarding.md](07-onboarding.md).

## 3. Inicio — `/inicio`

- Mientras no termine sus primeros pasos, arriba aparece la tarjeta **Primeros pasos** (tres enlaces, progreso "1 de 3", botón Ocultar).

- Fila de tarjetas con contadores (según rol, ver sitemap); cada tarjeta lleva a la lista ya filtrada.
- Debajo, tabla corta "Requieren tu atención" (5 filas).
- Cliente: botón principal "Nueva solicitud".

Componentes: `KpiCard`, `DataTable`, `StatusBadge`, `SlaIndicator`.

## 4. Lista de solicitudes — `/solicitudes`

```
Solicitudes                                  [+ Nueva solicitud]
[Buscar código…] [Estado ▾] [Prioridad ▾] [Categoría ▾] [Plazo ▾] [Desde–Hasta]
┌────────────┬──────────┬──────────┬─────────┬──────────┬─────────┬────────┐
│ Código     │ Cliente  │ Categoría│Prioridad│ Estado   │ Técnico │ Plazo  │
├────────────┼──────────┼──────────┼─────────┼──────────┼─────────┼────────┤
│ SOL-…-0123 │ Acme     │ Redes    │ ● Alta  │ Asignada │ J. Pérez│ ⚠ 3 h  │
└────────────┴──────────┴──────────┴─────────┴──────────┴─────────┴────────┘
                                             ‹ 1 2 3 ›   10 por página
```

- El cliente no ve la columna Cliente; el técnico no ve la columna Técnico.
- Los filtros se guardan en la URL para poder compartir el enlace.
- En móvil cada fila se muestra como tarjeta.

Componentes: `FilterBar`, `DataTable`, `Pagination`, `StatusBadge`, `PriorityBadge`, `SlaIndicator`, `EmptyState`.

## 5. Nueva solicitud — `/solicitudes/nueva`

- Cliente (solo coordinador) → Sede → Categoría → Prioridad → Equipo o recurso afectado → Descripción → Adjuntos.
- Al elegir la prioridad se muestra el plazo estimado ("Atención en 8 horas").
- Validación por campo; Guardar y Cancelar. Al guardar va al detalle y muestra el código.

Componentes: `RequestForm`, `FormField`, `AttachmentUploader`, `Toast`.

## 6. Detalle de solicitud — `/solicitudes/:id`

```
‹ Volver   SOL-2026-000123   [Asignada]  ● Alta   ⚠ vence en 3 h
                                   [Iniciar atención] [Pedir información]
┌─────────────────────────────────┬───────────────────────────┐
│ Datos                           │ Historial                 │
│ Cliente · Sede · Categoría      │ ● 10:20 Asignada a J.Pérez│
│ Equipo · Descripción            │   por M. Coord.           │
│ Adjuntos                        │ ● 09:55 Aprobada          │
│ Técnico asignado                │ ● 09:40 Registrada        │
│ Resolución (si existe)          │                           │
└─────────────────────────────────┴───────────────────────────┘
```

- Los botones dependen del rol y del estado actual (ver diagrama de estados).
- Acciones que exigen texto (cancelar, pedir información, resolver, rechazar, reabrir, reasignar) abren un diálogo con campo obligatorio.
- El historial y el estado se actualizan en vivo.
- **Modal Asignar técnico**: tabla de técnicos con especialidades, disponibilidad y barra de carga (3 de 5); los que no cumplen aparecen deshabilitados con el motivo; campo de justificación obligatorio al reasignar.

Componentes: `StatusBadge`, `PriorityBadge`, `SlaIndicator`, `StateActionButtons`, `HistoryTimeline`, `AssignTechnicianModal`, `TechnicianLoadBar`, `ConfirmDialog`.

## 7. Dashboard — `/dashboard`

- Filtros: rango de fechas, técnico, categoría (cliente también para el admin).
- Tarjetas: total, abiertas, vencidas, % cumplimiento de plazo, tiempo promedio de resolución.
- Gráficos: por estado (barras), por prioridad (barras), carga por técnico (barras horizontales), evolución temporal (líneas: creadas y resueltas).
- Tabla "Próximas a vencer".

Componentes: `DateRangeFilter`, `KpiCard`, `ChartCard`, `TechnicianLoadBar`, `DataTable`.

## 8. Tablero de carga — `/tecnicos/carga`

- Una fila por técnico: nombre, especialidades, disponible sí/no, barra de carga, lista de sus solicitudes activas con plazo.

## 9. Plantilla de administración — `/admin/*`

```
Usuarios                                      [+ Nuevo]
[Buscar…] [Rol ▾] [Activo ▾]
┌──────────┬───────────────┬────────────┬────────┬─────────┐
│ Nombre   │ Correo        │ Rol        │ Activo │ Acciones│
└──────────┴───────────────┴────────────┴────────┴─────────┘
```

- Crear y editar en modal. Eliminar pide confirmación; si hay registros relacionados se ofrece Desactivar.
- Misma plantilla para usuarios, clientes (con pestaña Sedes), técnicos (con selección de especialidades) y catálogos (pestañas Especialidades, Categorías, Prioridades con horas de plazo).

Componentes: `DataTable`, `FilterBar`, `FormField`, `ConfirmDialog`, `Toast`.

## 10. Notificaciones y Perfil

- Notificaciones: lista paginada, no leídas resaltadas, "Marcar todas como leídas", cada una enlaza a su solicitud.
- Perfil: datos personales y cambio de contraseña.

## Pantallas por rol

16 pantallas en total. Antes de entrar, todos usan las mismas 4: login, recuperar, restablecer y primer acceso.

| Rol | Con sesión | Cuáles |
|---|---|---|
| Cliente | 6 | Inicio, Mis solicitudes, Nueva solicitud, Detalle, Notificaciones, Perfil |
| Técnico | 5 | Inicio, Mis asignadas, Detalle, Notificaciones, Perfil |
| Coordinador | 8 | Inicio, Solicitudes, Nueva solicitud (para un cliente), Detalle, Dashboard, Carga de técnicos, Notificaciones, Perfil |
| Administrador | 11 | Inicio, Solicitudes, Detalle, Dashboard, Carga de técnicos, Usuarios, Clientes y sedes, Técnicos, Catálogos, Notificaciones, Perfil |

Cada pantalla cambia según el estado de la solicitud y el rol (qué botones aparecen). Los errores y estados de cada una están en [08-errores-y-estados.md](08-errores-y-estados.md).

## Enlace a los wireframes

- **Figma:** https://www.figma.com/design/BILUcM3dEcPDJL9kA1Ku9Q/ServiGest-%E2%80%93-Dise%C3%B1o?node-id=24-9366. Contiene:
  - *Pantallas por rol* (77).
  - *Flujos* (6): los 5 de [03-flujos.md](03-flujos.md) y el onboarding.
  - *Errores y estados* (21, E01–E21).
- **Prototipo navegable:** [prototipo.html](prototipo.html); abrirlo en el navegador. Se entra con cualquiera de los 4 roles y se recorre cada flujo de punta a punta. El botón **Simular** provoca cada error.

Las pantallas de Figma se generaron del mismo prototipo, así que lo que se ve en Figma es lo que se puede clicar.

Las pantallas usan el sistema visual de [06-sistema-visual.md](06-sistema-visual.md): neutros, un solo azul, estados con tono y botones en píldora. El prototipo funciona en modo claro y oscuro. El aspecto final lo dan los componentes de shadcn/ui, según el mapa de [05-componentes.md](05-componentes.md#base-shadcnui).
