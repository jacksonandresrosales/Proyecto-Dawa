# Diseño UX — ServiGest

Documentos de diseño previos al desarrollo (semana 1).

| Doc | Contenido |
|---|---|
| [01-roles-e-historias.md](01-roles-e-historias.md) | Roles, objetivos e historias de usuario |
| [02-sitemap.md](02-sitemap.md) | Mapa del sitio y permisos por rol |
| [03-flujos.md](03-flujos.md) | Flujos de usuario |
| [04-wireframes.md](04-wireframes.md) | Estructura de cada pantalla |
| [05-componentes.md](05-componentes.md) | Inventario de componentes React |
| [06-sistema-visual.md](06-sistema-visual.md) | Color, tipografía, espaciado, radios, botones, tarjetas, iconos y movimiento |
| [07-onboarding.md](07-onboarding.md) | Primer acceso, primeros pasos por rol y estados vacíos |
| [08-errores-y-estados.md](08-errores-y-estados.md) | Estados de cada pantalla, mensaje de cada error de la API y casos borde |
| [prototipo.html](prototipo.html) | Prototipo navegable con los 4 roles; abrirlo en el navegador |

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Las cuentas de cliente las crea el administrador; no hay registro público | Los clientes son organizaciones con contrato; evita cuentas falsas y una pantalla extra |
| El coordinador aprueba y asigna | Es quien conoce la carga del equipo; una sola bandeja de trabajo |
| El coordinador puede registrar solicitudes en nombre de un cliente | Hoy llegan por llamada y correo (problemática del enunciado); así todo queda en un solo registro |
| Escritorio primero, adaptable a móvil | Todos los roles trabajan principalmente en computador |
| Dashboard solo para administrador (todo) y coordinador (equipo) | El administrador cumple el papel de gerencia; técnico y cliente ven un resumen propio en Inicio |
| Notificaciones solo dentro de la aplicación, en vivo por SSE | Cumple el requisito de actualización sin recarga sin depender de un servicio de correo |
| Una sola aplicación con menú según rol | Menos código duplicado que cuatro portales |
| Estilo visual: neutros, un acento azul, botones en píldora | Consola sobria y densa, pensada para trabajo diario; ver 06-sistema-visual.md |
| Onboarding sin tour: primer acceso, tres pasos por rol y estados vacíos | Cada paso lleva a una pantalla real; nada que mantener aparte |
