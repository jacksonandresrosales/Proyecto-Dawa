# Roles e historias de usuario

## Roles

| Rol | Quién es | Qué viene a hacer |
|---|---|---|
| **Cliente** | Persona de contacto de una organización cliente | Registrar solicitudes, ver en qué estado están, responder pedidos de información |
| **Coordinador** | Personal de ServiGest que organiza el trabajo | Aprobar, asignar y reasignar, vigilar plazos, cerrar solicitudes |
| **Técnico** | Personal de ServiGest que ejecuta el servicio | Atender sus solicitudes asignadas y documentar la resolución |
| **Administrador** | Responsable del sistema y gerencia | Gestionar usuarios, clientes, técnicos, catálogos y parámetros; consultar indicadores |

## Historias de usuario

Formato: *Como [rol] quiero [acción] para [beneficio]*. **CA** = criterios de aceptación.

### Seguridad (todos)

| ID | Historia | CA |
|---|---|---|
| HU-01 | Como usuario quiero iniciar sesión con correo y contraseña para acceder a mis funciones | Credenciales inválidas muestran un mensaje genérico; al entrar veo el Inicio de mi rol; un usuario inactivo no entra |
| HU-02 | Como usuario quiero cerrar sesión para proteger mi cuenta | El token deja de usarse y vuelvo al login |
| HU-03 | Como usuario quiero restablecer mi contraseña para recuperar el acceso | Se genera un enlace de un solo uso con expiración; la respuesta no revela si el correo existe |
| HU-04 | Como usuario quiero ver y editar mi perfil | Puedo cambiar nombre, teléfono y contraseña (pidiendo la actual); no puedo cambiar mi rol |

### Cliente

| ID | Historia | CA |
|---|---|---|
| HU-10 | Como cliente quiero registrar una solicitud para pedir un servicio | Campos: categoría, prioridad, sede, equipo afectado, descripción, adjuntos opcionales; recibo un código único; queda en estado *registrada* |
| HU-11 | Como cliente quiero ver la lista de mis solicitudes para saber cómo van | Solo veo las de mi organización; puedo filtrar por estado y fecha; la lista está paginada |
| HU-12 | Como cliente quiero ver el detalle y el historial de una solicitud | Veo estado, técnico asignado, fecha límite e historial; no puedo abrir solicitudes de otro cliente (404) |
| HU-13 | Como cliente quiero responder cuando me piden información | Mi respuesta queda en el historial y la solicitud vuelve a *en proceso* |
| HU-14 | Como cliente quiero recibir avisos de los cambios | La campana se actualiza sin recargar la página |
| HU-15 | Como cliente quiero cancelar una solicitud que aún no se atiende | Solo si está *registrada* o *aprobada*; pide motivo |

### Coordinador

| ID | Historia | CA |
|---|---|---|
| HU-20 | Como coordinador quiero registrar una solicitud en nombre de un cliente | El formulario me deja elegir cliente y sede; queda registrado quién la creó |
| HU-21 | Como coordinador quiero aprobar o cancelar solicitudes registradas | Cancelar exige motivo; ambas acciones quedan en el historial |
| HU-22 | Como coordinador quiero asignar un técnico adecuado | La lista de técnicos muestra especialidad, disponibilidad y carga; el sistema rechaza técnicos sin la especialidad, no disponibles o con la carga al máximo |
| HU-23 | Como coordinador quiero reasignar una solicitud | Exige justificación; la asignación anterior queda en el historial |
| HU-24 | Como coordinador quiero ver las solicitudes vencidas o por vencer | Indicador de plazo en la lista y filtro por "por vencer" y "vencidas" |
| HU-25 | Como coordinador quiero cerrar una solicitud resuelta | Solo si tiene resolución documentada |
| HU-26 | Como coordinador quiero reabrir una solicitud cerrada | Exige justificación y queda auditado |
| HU-27 | Como coordinador quiero ver la carga de cada técnico | Tablero con solicitudes activas por técnico contra su carga máxima |
| HU-28 | Como coordinador quiero ver indicadores de mi equipo | Dashboard con filtros de fecha, técnico y categoría |

### Técnico

| ID | Historia | CA |
|---|---|---|
| HU-30 | Como técnico quiero ver mis solicitudes asignadas ordenadas por plazo | Solo veo las asignadas a mí |
| HU-31 | Como técnico quiero iniciar la atención | Pasa de *asignada* a *en proceso* |
| HU-32 | Como técnico quiero pedir información al cliente | Exige un mensaje; pasa a *pendiente de información*; el cliente recibe aviso |
| HU-33 | Como técnico quiero marcar una solicitud como resuelta | Exige describir la resolución |
| HU-34 | Como técnico no debo poder modificar solicitudes de otros | El servidor responde 403 |

### Administrador

| ID | Historia | CA |
|---|---|---|
| HU-40 | Como administrador quiero gestionar usuarios y roles | Crear, editar, desactivar, restablecer contraseña; correo único |
| HU-41 | Como administrador quiero gestionar clientes y sus sedes | RUC único; no se puede eliminar un cliente con solicitudes, solo desactivar |
| HU-42 | Como administrador quiero gestionar técnicos y sus especialidades | Disponibilidad y carga máxima editables |
| HU-43 | Como administrador quiero gestionar catálogos | Especialidades, categorías y prioridades con sus horas de plazo; nombres sin duplicar; no se elimina lo que está en uso |
| HU-44 | Como administrador quiero ver los indicadores globales | Dashboard completo calculado desde datos reales |
