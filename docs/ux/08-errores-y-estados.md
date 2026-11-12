# Errores y estados

Regla: **ninguna pantalla queda en blanco y ningún error queda sin salida**. Cada caso de este documento se ve en Figma (página *Errores y estados*, pantallas E01–E21) y se puede provocar en el prototipo con el panel **Simular**.

## 1. Estados de cada pantalla

| Pantalla | Cargando | Vacío | Vacío con filtros | Error de carga | Casos propios |
|---|---|---|---|---|---|
| Login | — | — | — | — | Credenciales inválidas (mensaje genérico), cuenta desactivada, empresa inactiva, sesión vencida |
| Recuperar | — | — | — | — | Respuesta neutra exista o no el correo |
| Restablecer | — | — | — | — | Enlace inválido, vencido (30 min) o ya usado → "Pedir un enlace nuevo" |
| Primer acceso | — | — | — | — | No puede repetir la temporal; regla de contraseña visible |
| Inicio | Esqueleto | Por rol (07-onboarding.md §4) | — | Reintentar | Primeros pasos mientras no los termine |
| Solicitudes | Esqueleto | Por rol | "Limpiar filtros" | Reintentar | Fechas invertidas: aviso y no filtra por fecha |
| Nueva solicitud | — | — | — | — | Validación por campo, límite de adjuntos, salir con cambios, categoría desactivada mientras escribe |
| Detalle | Esqueleto | — | — | Reintentar | 404, 409, transición inválida, técnico o categoría desactivados |
| Dashboard | Esqueleto | "Aún no hay datos en este periodo" | Mismo vacío + "Ver todo el historial" | Reintentar | — |
| Carga de técnicos | Esqueleto | "Todavía no hay técnicos" | — | Reintentar | Técnico inactivo con activas: aviso "hay que reasignarlas" |
| Notificaciones | Esqueleto | "No tienes notificaciones" | — | Reintentar | Campana vacía |
| Perfil | — | — | — | — | Teléfono de 10 dígitos; contraseña actual incorrecta |
| Usuarios | Esqueleto | Acción "Nuevo usuario" | "Limpiar filtros" | Reintentar | Correo duplicado, no eliminar con relaciones, no eliminarse a sí mismo |
| Clientes y sedes | Esqueleto | Acción "Nuevo cliente" | — | Reintentar | RUC duplicado o inválido, al menos una sede, sede con solicitudes no se quita |
| Técnicos | Esqueleto | Acción "Nuevo técnico" | — | Reintentar | Carga máxima entre 1 y 20 y no menor que sus activas |
| Catálogos | — | Por pestaña | — | Reintentar | Nombre duplicado, categoría sin especialidad, en uso → Desactivar |

Estados que aplican a **todas** las pantallas con sesión:

| Estado | Qué ve el usuario | Cómo sigue |
|---|---|---|
| Sin conexión | Banda fija arriba; al guardar, aviso `SIN_CONEXION` | Sigue leyendo; nada se pierde. Al volver la red: toast "Conexión restablecida" |
| Sesión vencida (401) | Login con aviso `NO_AUTENTICADO` | Al ingresar con la misma cuenta vuelve a la pantalla donde estaba |
| Sin permiso (403) | Inicio con aviso `SIN_PERMISO` | — |
| Error del servidor (500) | Aviso `ERROR_INTERNO`; el formulario conserva lo escrito | Vuelve a enviar |
| Cuenta desactivada con sesión abierta | Login con aviso `CUENTA_INACTIVA` | Habla con el administrador |

## 2. Errores de la API → mensaje → dónde se muestra

Los códigos están en [../tecnico/04-api.md](../tecnico/04-api.md). El texto es el que muestra la interfaz.

| Código | HTTP | Mensaje | Dónde | Cómo sigue |
|---|---|---|---|---|
| `VALIDACION` | 422 | El de cada campo (`details`) | Bajo cada campo; foco al primero con error | Corrige y reenvía |
| `CREDENCIALES_INVALIDAS` | 401 | Correo o contraseña incorrectos | Alerta del formulario; se borra la contraseña | Reintenta u "Olvidé mi contraseña" |
| `CAMBIO_PASSWORD_REQUERIDO` | 403 | Debes cambiar tu contraseña temporal | Redirige a primer acceso | Crea su contraseña |
| `NO_AUTENTICADO` | 401 | Tu sesión expiró. Vuelve a ingresar y seguirás donde estabas. | Aviso en el login | Ingresa y vuelve a la ruta |
| `SIN_PERMISO` | 403 | No tienes acceso a esa sección. Te llevamos al inicio. | Aviso en Inicio | — |
| `NO_ENCONTRADO` | 404 | No encontramos esta solicitud | Tarjeta en lugar del detalle | "Volver a la lista" |
| `DUPLICADO` | 409 | Ya existe un usuario con este correo / un cliente con este RUC / esa categoría ya existe | Bajo el campo | Cambia el dato |
| `TRANSICION_INVALIDA` | 409 | La solicitud cambió de estado mientras la veías. Revisa su estado actual. | Aviso; el detalle se recarga | Elige una acción válida |
| `CONFLICTO_VERSION` | 409 | Otra persona modificó esta solicitud. Recargamos sus datos; lo que escribiste sigue aquí. Vuelve a enviar. | Aviso; el modal sigue abierto con el texto | Reenvía |
| `EN_USO` | 409 | Tiene registros relacionados, por eso no se puede eliminar. Puedes desactivarlo. | Diálogo "No se puede eliminar" | Botón Desactivar |
| `RESOLUCION_REQUERIDA` | 422 | No se puede cerrar sin resolución documentada. | Aviso / bajo el campo de resolución | Documenta la resolución |
| `TECNICO_SIN_ESPECIALIDAD` | 422 | No se puede asignar: el técnico no tiene la especialidad de esta categoría. | Modal asignar: fila deshabilitada con motivo | Elige otro |
| `TECNICO_NO_DISPONIBLE` | 422 | No se puede asignar: el técnico no está disponible. | Igual | Elige otro |
| `TECNICO_CARGA_MAXIMA` | 422 | No se puede asignar: el técnico llegó a su carga máxima. | Igual | Elige otro o reasigna carga |
| `JUSTIFICACION_REQUERIDA` | 422 | La justificación es obligatoria al reasignar. | Bajo el campo Justificación | La escribe |
| — (red caída) | — | Sin conexión. No se guardó nada; inténtalo cuando vuelvas a estar en línea. | Aviso + banda | Espera la red |
| — (500) | 500 | Algo falló de nuestro lado. No se guardó nada; lo que escribiste sigue aquí. Intenta de nuevo. | Aviso | Reenvía |

## 3. Reglas de experiencia

- **Sin doble envío:** al enviar, el botón se desactiva y dice "Guardando…".
- **Nada se pierde:** con error, el formulario conserva lo escrito. Salir de Nueva solicitud con datos pide confirmación, y cerrar la pestaña avisa.
- **Foco:** tras un error de validación va al primer campo con error. Los modales atrapan el foco, Escape los cierra y el foco vuelve al botón que los abrió.
- **Confirmación:** eliminar, cancelar y descartar siempre se confirman. Lo que tiene relaciones no se elimina: se desactiva.
- **Anuncios:** los toasts usan `role="status"`; los errores y avisos, `role="alert"`.
- **Límites:**

  | Campo | Máximo |
  |---|---|
  | Nombre | 120 |
  | Correo | 160 |
  | Equipo | 120 |
  | Descripción | 2000, con contador |
  | Comentarios y justificación | 1000 |
  | Sede | 120 |
  | Nombre de catálogo | 60 |

  Adjuntos: solo PDF, JPG o PNG, 5 MB cada uno, máximo 5 y sin nombres repetidos.
- **Datos que cambian solos:** el plazo se recalcula en pantalla. Si otro usuario cambió la solicitud, se aplican los 409 de arriba. Con varias pestañas abiertas, una ve los cambios de la otra.
- **Accesibilidad y tamaños:** todo se usa con teclado y funciona con zoom al 200 %, en móvil a 375 px y en modo oscuro.

## 4. Casos borde y decisión

| Caso | Decisión |
|---|---|
| Usuario desactivado con la sesión abierta | En su siguiente petición la API responde 401 y la interfaz muestra `CUENTA_INACTIVA` en el login |
| Empresa del cliente desactivada | Sus usuarios no pueden ingresar; el historial se conserva |
| Técnico desactivado con asignaciones activas | Las conserva; Carga y Detalle avisan al coordinador que debe reasignarlas. Ya no aparece como apto en Asignar |
| Categoría o especialidad desactivada | No se ofrece en registros nuevos; las solicitudes existentes la muestran con "(inactiva)" |
| La categoría se desactiva mientras alguien escribe una solicitud | Al guardar: "Esa categoría ya no está disponible. Elige otra." |
| Contraseña temporal sin cambiar | Toda ruta lleva a primer acceso hasta que la cambie |
| Enlace de restablecer usado dos veces o vencido | Pantalla "Enlace inválido o vencido" con "Pedir un enlace nuevo" |
| Recuperar con un correo que no existe | Mismo mensaje neutro que si existiera, para no revelar cuentas |
| Carga máxima menor que las activas actuales | Se rechaza: "Reasigna primero" |
| Sede con solicitudes | No se quita del cliente |
| El administrador intenta eliminarse a sí mismo | Botón deshabilitado con explicación |

## 5. Cómo verlo en el prototipo

El botón **Simular** (abajo a la izquierda, solo en la demo) abre un panel con estas opciones:

| Opción | Provoca |
|---|---|
| Red lenta | Esqueletos y "Guardando…" visibles |
| Sin conexión | Banda y aviso al guardar (también reacciona al modo avión real) |
| Error 500 en la próxima acción | Aviso; lo escrito se conserva |
| Conflicto 409 en el próximo cambio | Aviso en un cambio de estado o una asignación |
| Falla la carga de la próxima pantalla | Tarjeta con Reintentar |
| Vencer la sesión | Login y vuelta a la misma pantalla |
| Abrir una ruta sin permiso | Aviso 403 en Inicio |
| Abrir una solicitud que no existe | Tarjeta 404 |
| Desactivar mi cuenta | Salida con aviso |

`prototipo.html#autoprueba` corre en la consola las comprobaciones de transiciones, plazos, asignación, contraseñas, correo duplicado y que cada código de error tenga su mensaje.
