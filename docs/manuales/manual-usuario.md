# Manual de Usuario — ServiGest

**Sistema de Gestión de Servicios y Solicitudes**

- **Entorno en producción:** [https://servigest-frontend.pages.dev](https://servigest-frontend.pages.dev/)
- **Roles cubiertos:** Cliente, Técnico, Coordinador y Administrador
- **Versión:** 1.0


## Tabla de contenido

1. [Acceso general y seguridad de cuenta](#1-acceso-general-y-seguridad-de-cuenta)
2. [Guía del Cliente](#2-guía-del-cliente)
3. [Guía del Técnico](#3-guía-del-técnico)
4. [Guía del Coordinador](#4-guía-del-coordinador)
5. [Guía del Administrador](#5-guía-del-administrador)
6. [Solución de problemas frecuentes](#6-solución-de-problemas-frecuentes)

---

## 1. Acceso general y seguridad de cuenta

ServiGest no tiene registro público. El Administrador crea las cuentas y entrega las credenciales por un canal seguro.

### 1.1 Inicio de sesión y primer acceso

1. Abre [https://servigest-frontend.pages.dev](https://servigest-frontend.pages.dev/) e ingresa el correo y la contraseña de tu cuenta.
2. Si es tu primer ingreso o el Administrador restableció tu contraseña, el sistema te pedirá crear una contraseña personal antes de continuar:
   - Mínimo **8 caracteres** y máximo **72**.
   - Debe incluir al menos **una letra** y **un número**.
3. Para salir, utiliza **Cerrar sesión** en la barra superior.

### 1.2 Perfil y notificaciones

Estas opciones están disponibles para todos los roles:

- **Mi perfil:** actualiza tu nombre y teléfono. El correo es de solo lectura. Para cambiar tu contraseña desde el perfil, indica la contraseña actual y confirma la nueva.
- **Notificaciones:** la campana muestra el total de avisos sin leer. Al abrir un aviso relacionado con una solicitud, ServiGest te lleva a su detalle. En **Ver todas las notificaciones** puedes filtrar las no leídas o marcarlas todas como leídas.
- La sesión puede cerrarse automáticamente si vence o si el Administrador desactiva la cuenta; al volver a iniciar sesión podrás regresar a la página solicitada.

### 1.3 Recuperar contraseña

En la pantalla de inicio de sesión, selecciona **Olvidé mi contraseña** y envía el correo de tu cuenta. La respuesta es neutra para no revelar si el correo está registrado. **Producción no envía automáticamente un enlace por correo**: contacta al Administrador para que genere una contraseña temporal. En desarrollo, el enlace se imprime en la consola del backend.

---

## 2. Guía del Cliente

**Propósito:** registrar solicitudes para las sedes de tu organización, adjuntar evidencias y dar seguimiento hasta su cierre.

### 2.1 Navegación disponible

La barra superior incluye **Inicio**, **Solicitudes**, **Mi perfil**, **Notificaciones** y **Cerrar sesión**. El botón **Nueva solicitud** está disponible en Inicio y en Solicitudes.

### 2.2 Registrar una solicitud

1. Selecciona **Nueva solicitud**.
2. Elige la **sede** de tu organización, la **categoría** y la **prioridad**. Las opciones de prioridad muestran sus horas objetivo de atención (SLA).
3. Completa **Equipo o recurso afectado** y describe el problema con al menos 10 caracteres.
4. De forma opcional, adjunta hasta **5 archivos**, de máximo **5 MB** cada uno. Se admiten **PDF, PNG, JPG, WEBP y TXT**.
5. Pulsa **Registrar solicitud**. ServiGest genera un código y abre el detalle.

Si falla la carga de uno o más archivos, la solicitud queda registrada. Se mostrarán los archivos que no se adjuntaron y podrás volver a intentarlo desde el detalle, si la solicitud sigue abierta.

### 2.3 Consultar, responder o cancelar

1. Abre **Solicitudes**. Puedes buscar por código, equipo o descripción y filtrar por **estado** o rango de fechas. Pulsa **Filtrar** para aplicar los criterios y **Limpiar** para restablecerlos. Se muestran 10 solicitudes por página.
2. Selecciona una solicitud para revisar el estado, la prioridad, la fecha límite, el técnico asignado, los adjuntos y el **Historial**.
3. Si está **Pendiente de información**, pulsa **Responder** y escribe la información solicitada. La solicitud vuelve a **En proceso**.
4. Puedes **Cancelar solicitud** únicamente cuando está **Registrada** o **Aprobada**; debes indicar el motivo. El cierre de una solicitud resuelta lo realiza el Coordinador.

El reloj del SLA no se detiene mientras la solicitud espera información.

---

## 3. Guía del Técnico

**Propósito:** atender las solicitudes asignadas, documentar avances y registrar su resolución.

### 3.1 Navegación disponible

La barra superior incluye **Inicio**, **Solicitudes** (titulada **Asignadas a mí**), **Mi perfil**, **Notificaciones** y **Cerrar sesión**. No se muestran el Dashboard, la Carga de técnicos ni la Administración.

### 3.2 Revisar solicitudes asignadas

1. En **Inicio**, revisa los contadores **Por iniciar**, **En proceso** y **Esperando al cliente**.
2. Abre **Solicitudes** para consultar las solicitudes asignadas a tu usuario. Puedes buscar por texto, filtrar por estado o fechas y recorrer las páginas.
3. Abre el detalle para revisar la descripción, prioridad, plazo SLA, archivos adjuntos e historial.

### 3.3 Atender y resolver una solicitud

1. En estado **Asignada**, pulsa **Iniciar atención** para cambiarla a **En proceso**.
2. Si necesitas información del cliente, pulsa **Pedir información** y explica qué se debe aclarar. El estado pasa a **Pendiente de información**.
3. Cuando el cliente responda, la solicitud vuelve a **En proceso**; continúa la atención desde el detalle.
4. Al terminar el trabajo, pulsa **Marcar como resuelta** y documenta obligatoriamente la resolución. La solicitud pasa a **Resuelta** para que el Coordinador la revise y cierre.

Puedes descargar los adjuntos de una solicitud, pero no subir archivos desde la cuenta de Técnico.

---

## 4. Guía del Coordinador

**Propósito:** registrar solicitudes en nombre de clientes, revisar las entrantes, asignar técnicos y supervisar el trabajo y los plazos.

### 4.1 Navegación disponible

La barra superior incluye **Inicio**, **Solicitudes**, **Dashboard**, **Carga de técnicos**, **Clientes y catálogos** (`/admin`), **Mi perfil**, **Notificaciones** y **Cerrar sesión**. El Coordinador puede usar `/admin` para gestionar clientes, técnicos y catálogos; **Usuarios** (`/admin/usuarios`) es exclusivo del Administrador.

### 4.2 Registrar y gestionar solicitudes

1. Para registrar una solicitud en nombre de un cliente, selecciona **Nueva solicitud**. Elige el cliente, su sede, categoría y prioridad; completa el equipo afectado y la descripción. Los límites de adjuntos son los indicados en la [Guía del Cliente](#2-guía-del-cliente).
2. Para revisar una solicitud nueva, abre una que esté **Registrada** desde Inicio o Solicitudes y pulsa **Aprobar**. Si debe cancelarse, utiliza **Cancelar solicitud** e indica el motivo.
3. En una solicitud **Aprobada**, pulsa **Asignar técnico**. Elige un técnico apto y confirma.
4. Para cambiar un técnico asignado, pulsa **Reasignar técnico**, selecciona otro y escribe una justificación.
5. La lista de asignación muestra especialidad, disponibilidad y carga actual frente a la carga máxima. El backend vuelve a validar esas condiciones al confirmar.
6. Cuando una solicitud está **Pendiente de información**, el Coordinador también puede responder con un comentario. Cuando está **Resuelta**, revisa la resolución y pulsa **Cerrar solicitud**; también puede rechazar una resolución con un comentario para devolverla a **En proceso**.
7. El Coordinador puede reabrir una solicitud cerrada con un motivo.

Solo se permite asignar en estado **Aprobada** y reasignar cuando ya está **Asignada**, **En proceso** o **Pendiente de información**. El SLA sigue avanzando mientras se espera información.
El Coordinador también puede subir adjuntos desde el detalle mientras la solicitud no esté cerrada ni cancelada.

### 4.3 Supervisar y gestionar recursos

- **Dashboard:** selecciona **7 días**, **30 días** o **Todo**; puedes filtrar por categoría, técnico o cliente. Se muestran totales, solicitudes abiertas y vencidas, cumplimiento SLA, tiempo promedio de resolución, distribución por estado y prioridad, carga por técnico, evolución diaria y próximas a vencer.
- **Carga de técnicos:** consulta la disponibilidad, especialidades y solicitudes activas frente a la carga máxima de cada técnico.
- **Clientes y catálogos (`/admin`):** administra clientes, técnicos, especialidades, categorías y parámetros SLA. Los formularios y acciones se describen en la sección [Administrador](#5-guía-del-administrador).
- El Dashboard y la carga se limitan al equipo del Coordinador según las reglas de acceso del backend.

---

## 5. Guía del Administrador

**Propósito:** gestionar cuentas de usuario, configurar los recursos operativos y supervisar la plataforma.

### 5.1 Navegación disponible

Incluye **Inicio**, **Solicitudes**, **Dashboard**, **Carga de técnicos**, **Clientes y catálogos** (`/admin`), **Usuarios** (`/admin/usuarios`), **Mi perfil**, **Notificaciones** y **Cerrar sesión**.

**Nota sobre permisos:** `/admin`, Dashboard y Carga de técnicos también están habilitados para el Coordinador. La sección **Usuarios** es exclusiva del Administrador.

### 5.2 Supervisar solicitudes y reabrir

1. Desde **Solicitudes**, consulta el listado general, abre detalles y descarga adjuntos.
2. Si una solicitud cerrada requiere revisión adicional, pulsa **Reabrir** e indica el motivo.
3. El Administrador no registra solicitudes ni aprueba, asigna/reasigna o cierra solicitudes. Esas acciones pertenecen al Cliente o al Coordinador según el flujo.

### 5.3 Clientes, técnicos y catálogos (`/admin`)

En **Clientes y catálogos**, utiliza las pestañas principales **Clientes**, **Técnicos** y **Catálogos**. Dentro de Catálogos están **Especialidades**, **Categorías** y **Parámetros SLA**.

| Pestaña | Operaciones | Validaciones principales |
|---|---|---|
| **Clientes** | Crear, editar, activar/inactivar y eliminar clientes y sedes | RUC único de 13 dígitos; al menos una sede con nombre y dirección |
| **Técnicos** | Crear, editar, activar/inactivar y eliminar perfiles técnicos | Al menos una especialidad; disponibilidad; carga máxima de 1 a 20 |
| **Catálogos** | Gestionar especialidades, categorías y prioridades | Cada categoría requiere una especialidad; las prioridades requieren horas SLA positivas |

Las listas incluyen búsqueda, filtro por vigencia y paginación. En cada fila aparecen **Editar**, **Inactivar/Activar** y **Eliminar**. El borrado solicita confirmación; si existen relaciones que impiden eliminar el registro, utiliza **Inactivar**.

Al crear una cuenta de Cliente o Técnico, ServiGest muestra una contraseña temporal una sola vez. Entrégala por un canal seguro y pide al usuario que la cambie al ingresar.

### 5.4 Usuarios (`/admin/usuarios`)

1. Busca usuarios por nombre o correo y filtra por rol o vigencia.
2. Puedes crear cuentas de **Administrador** o **Coordinador**, editar cuentas, restablecer contraseñas temporales y desactivar/reactivar usuarios.
3. Las cuentas de Cliente y Técnico se crean en sus respectivas secciones de `/admin`.
4. La contraseña temporal generada al crear o restablecer una cuenta solo aparece una vez. Cópiala y entrégala por un canal seguro.
5. No puedes desactivar tu propia cuenta.

---

## 6. Solución de problemas frecuentes

| Situación | Causa probable | Acción recomendada |
|---|---|---|
| **Olvidé mi contraseña** | Producción no envía enlaces de recuperación por correo | Solicita al Administrador una contraseña temporal y cámbiala al ingresar |
| **Error al adjuntar un archivo** | Formato no admitido, archivo mayor a 5 MB o más de 5 archivos en la solicitud | Comprueba que sea PDF, PNG, JPG, WEBP o TXT, que pese como máximo 5 MB y que no se haya alcanzado el límite |
| **Conflicto al actualizar una solicitud** | Otra persona cambió la solicitud mientras la tenías abierta | Recarga el detalle y revisa el estado antes de intentar la acción nuevamente |
| **No se puede eliminar un registro** | Tiene solicitudes u otras relaciones asociadas | Utiliza **Inactivar** para conservar el historial |
| **Acceso denegado o solicitud no encontrada** | El rol no permite la acción o la solicitud no pertenece a tu alcance | Comprueba la cuenta activa y el rol; solicita ayuda al Administrador o Coordinador |
| **La lista o el detalle no carga** | Error temporal de conexión o del servidor | Pulsa **Reintentar** si aparece; si continúa, contacta al administrador del sistema |
