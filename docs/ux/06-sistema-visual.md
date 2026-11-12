# Sistema visual

Estilo de consola sobria: neutros que sostienen casi todo, un solo acento azul, estados con fondo tenue y texto oscuro, botones en píldora y tarjetas de radio 14.

Los valores viven como variables CSS en `frontend/src/index.css` y shadcn/ui los consume. Ningún componente escribe un color o un radio a mano: usa la clase de Tailwind del token (`bg-card`, `text-muted-foreground`, `rounded-xl`…).

## 1. Principios

1. **La tarea organiza la pantalla.** Primero qué hace el usuario (aprobar, asignar, atender), después el componente.
2. **Jerarquía con superficie, espacio y contraste**, no con color. El color se reserva al acento y a los estados.
3. **Acento, selección y estado son cosas distintas.** El azul marca la acción principal y el foco; el estado de una solicitud usa su propio tono.
4. **La densidad cambia con el trabajo.** Tablas compactas; detalle y formularios con aire.
5. **Cada pantalla diseña cargando, vacío, error, desactivado y guardado**, no solo el caso con datos.

## 2. Color

Claro es el tema por defecto; oscuro sigue la preferencia del sistema (`.dark`).

| Función | Token shadcn | Claro | Oscuro |
|---|---|---|---|
| Lienzo | `--background` | `#FBFBFB` | `#0E0E10` |
| Superficie (tarjeta, menú, modal) | `--card`, `--popover` | `#FFFFFF` | `#151517` |
| Superficie secundaria | `--secondary`, `--muted` | `#F8F8F8` | `#1C1C1F` |
| Hover / fila seleccionada | `--accent` | `#F2F2F2` | `#232327` |
| Texto principal | `--foreground` | `#333333` | `#E8E8EA` |
| Texto secundario | `--muted-foreground` | `#777777` | `#9A9AA2` |
| Línea | `--border` | `#EDEDED` | `#2A2A2E` |
| Línea de campo | `--input` | `#E1E1E1` | `#34343A` |
| Acento (botón principal, enlace, foco) | `--primary`, `--ring` | `#2567FF` | `#4073D4` |
| Texto sobre acento | `--primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| Peligro | `--destructive` | `#C4281C` | `#FF7A70` |

Ojo con los nombres: en shadcn `--accent` es el gris de hover, no el azul. El azul es `--primary`.

### Tonos de estado

Píldora con fondo tenue, texto oscuro del mismo tono y punto de color. Contraste del texto ≥ 4,5:1 en ambos temas.

| Tono | Fondo claro | Texto claro | Punto | Uso en ServiGest |
|---|---|---|---|---|
| `neutral` | `#F2F2F7` | `#636366` | `#AEAEB2` | Cerrada, prioridad baja, plazo cumplido |
| `warning` | `#FFF7E0` | `#8A5F00` | `#F2A900` | Registrada (espera aprobación), plazo por vencer |
| `accent` | `#EAF1FF` | `#07479E` | `#2567FF` | Aprobada, asignada |
| `info` | `#EAF1FF` | `#1B4FE0` | `#2567FF` | En proceso, prioridad media |
| `review` | `#FFF1DE` | `#9A5200` | `#FF9500` | Pendiente de información (espera respuesta del cliente), prioridad alta |
| `success` | `#E7F7EC` | `#1B7A3A` | `#34C759` | Resuelta, plazo a tiempo |
| `danger` | `#FFEBE9` | `#C4281C` | `#FF3B30` | Cancelada, plazo vencido o incumplido |
| `critical` | `#D92D20` | `#FFFFFF` | – | Prioridad crítica (sólido, el único) |

En oscuro el fondo es el punto al 14 % y el texto se aclara (`success #5BD68F`, `warning #F5C451`, `review #FFB35C`, `danger #FF7A70`, `info/accent #8DB4FF`, `neutral #A6A6AE`).

El estado siempre lleva texto; el color nunca es la única señal.

## 3. Tipografía

**Inter** para la interfaz y **Geist Mono** para códigos y cifras técnicas (`SOL-2026-000126`, horas restantes). Ambas con licencia OFL, cargadas desde Google Fonts. Números de tablas y KPI con `tabular-nums`.

| Token | Tamaño / interlínea · peso | Uso |
|---|---|---|
| `text-xs` | 12/16 · 500 | Encabezado de tabla, etiqueta de campo, píldora |
| `text-sm` | 13/20 · 400 | Texto secundario, ayudas, metadatos |
| `text-base` | 13,5/20 · 400 | Cuerpo, filas de tabla, campos; botones con 500 |
| `text-md` | 15/20 · 600 | Título de tarjeta y de modal |
| `text-lg` | 18/24 · 600 | Título de sección |
| `text-xl` | 26/32 · 500 | Título de página y cifra de KPI |
| `font-mono` | 12,5/18 · 400 | Códigos, fechas técnicas, tiempos |

La etiqueta va siempre encima del campo; el placeholder no la sustituye.

## 4. Espaciado y retícula

Base de 4 px (`--spacing` de Tailwind). Valores habituales: **6, 8, 10, 12, 14, 16, 24**. No se redondea todo a múltiplos de 8.

| Dónde | Valor |
|---|---|
| Entre icono y texto en un botón | 6 |
| Entre campos de un formulario | 16 |
| Relleno de tarjeta | 14–16 |
| Entre tarjetas | 12 |
| Relleno del área de contenido | 24 (16 en móvil) |
| Menú lateral | 280 abierto · 48 plegado |
| Ancho máximo de formularios | 640 |

Puntos de corte: **768** (móvil ↔ tableta) y **1024** (tableta ↔ escritorio). Se revisa a 375, 1366 y 1920.

## 5. Radios

Los nombres de shadcn se mapean a estos valores (`--radius: 14px`):

| Pieza | Radio | Clase |
|---|---|---|
| Botón, píldora de estado, pestañas, filtros | 9999 (píldora) | `rounded-full` |
| Botón de icono, tooltip | 8 | `rounded-md` |
| Campo de texto, select | 10 | `rounded-lg` |
| Tarjeta, menú, popover | 14 | `rounded-xl` |
| Modal | 24 | `rounded-3xl` |

## 6. Elevación y capas

- Tarjeta: borde `--border`; sombra `0 1px 3px #00000008` solo en claro, ninguna en oscuro.
- Menús, popovers y modales tienen su propia sombra; no se reutiliza la de la tarjeta.
- Capas (`z-index`): cabecera fija 40 · overlay 100 · modal 110 · popover 120 · toast 130 · tooltip 140.

## 7. Componentes base

### Botones

| Tamaño | Alto escritorio | Alto móvil | Relleno | Icono |
|---|---|---|---|---|
| `sm` | 28 | 32 | 0 12 | 13 |
| `default` | 32 | 36 | 0 14 | 14 |
| `lg` | 44 | 44 | 0 18 | 18 |
| `icon` | 30 × 30 (radio 8) | 36 × 36 | – | 16 |

| Variante | Aspecto | Uso |
|---|---|---|
| `default` (principal) | Fondo acento, texto blanco | Una por pantalla o modal: Registrar, Asignar, Guardar |
| `outline` (secundario) | Fondo superficie, borde `--input` | Acciones de barra y formularios: Filtrar, Exportar |
| `ghost` | Sin fondo, texto secundario | Acciones silenciosas en filas |
| `destructive` | Texto o fondo de peligro | Cancelar solicitud, desactivar; siempre con confirmación |
| `link` | Texto acento | Navegación dentro de un texto |

Una acción destructiva nunca es la principal por ser la última. Mientras se envía: el botón se desactiva y muestra "Guardando…".

### Campos

Alto 32 (36 en formularios largos y en móvil), radio 10, relleno horizontal 12, borde `--input`. Foco: anillo acento de 3 px al 50 %. Error: borde y mensaje en `--destructive` debajo del campo.

### Tarjetas

Radio 14, borde `--border`, relleno 14–16, separación interna 12. Cabecera con título `text-md` y acción a la derecha. En el dashboard, la tarjeta KPI muestra etiqueta `text-sm`, cifra `text-xl tabular-nums` y variación opcional.

### Píldoras de estado

Alto 24, relleno 0 8, radio píldora, `text-xs` 500, punto de 6 px a la izquierda. Tonos de la sección 2.

### Tablas

Encabezado 36 px (`text-xs` 500, texto secundario); filas de 44 px (una línea) o 56 px (dos líneas), `text-base`. Hover con `--accent`; la fila seleccionada además lleva borde izquierdo acento. En móvil cada fila pasa a tarjeta.

### Modales

Ancho 480, relleno 24, separación 24, radio 24. En móvil se abre como hoja inferior a ancho completo. Foco inicial en el primer campo, Escape cierra, el foco vuelve al botón que lo abrió.

### Menú lateral

280 px abierto, 48 plegado. Filas de 32 px, icono de 20 px, radio 8. Elemento activo con fondo `--accent` y texto principal; grupos con encabezado `text-xs` secundario.

## 8. Iconos

**Lucide** (`lucide-react`, ya instalado con shadcn): solo trazo, esquinas redondeadas, grosor 1,75. Tamaños: 14 en botones, 16 por defecto, 20 en el menú lateral. Un botón de solo icono lleva `aria-label` con la acción concreta ("Asignar técnico", no "Acción").

| Concepto | Icono |
|---|---|
| Inicio | `House` |
| Solicitudes | `ClipboardList` |
| Nueva solicitud | `Plus` |
| Dashboard | `ChartColumn` |
| Carga de técnicos | `Users` |
| Notificaciones | `Bell` |
| Asignar | `UserPlus` |
| Plazo | `Clock` |
| Adjunto | `Paperclip` |
| Administración | `Settings` |

## 9. Movimiento

Rápido 160 ms, base 200 ms, salida 120 ms, curva `ease-out`. La animación acompaña la acción, nunca la retrasa. Con `prefers-reduced-motion: reduce` se quitan desplazamientos y escalas; solo quedan cambios de opacidad.

## 10. Accesibilidad

- Contraste de texto ≥ 4,5:1 (los tonos de la sección 2 ya lo cumplen).
- Foco visible en todo control; orden de tabulación igual al visual.
- Objetivo táctil ≥ 24 px en escritorio y ≥ 36 px en móvil.
- Estados y errores con texto, no solo color.
- Se prueba con teclado y a 200 % de zoom antes de cerrar una pantalla.
