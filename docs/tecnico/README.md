# Documento técnico — ServiGest

| Doc | Contenido |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Capas, carpetas y stack justificado |
| [02-modelo-datos.md](02-modelo-datos.md) | Modelo lógico y físico |
| [03-estados-y-reglas.md](03-estados-y-reglas.md) | Máquina de estados y reglas de negocio |
| [04-api.md](04-api.md) | Contratos REST |
| [05-seguridad.md](05-seguridad.md) | Autenticación, autorización y secretos |
| [06-backlog-equipo.md](06-backlog-equipo.md) | Reparto, plan y checklist del enunciado |

## Estado de entrega

El despliegue multi-cloud está operativo: frontend en [Cloudflare Pages](https://servigest-frontend.pages.dev/), API en [Railway](https://carefree-acceptance-production.up.railway.app) y PostgreSQL en Neon. La aplicación y el health check de la API responden correctamente.

En la última verificación, `npm test` pasó con 38 pruebas unitarias, 29 de integración y 18 de frontend; `npm run lint` y `npm run typecheck` también finalizaron correctamente. La ejecución de integración requiere el servicio `db_test` de Docker Compose disponible en el puerto 5433.

Pendiente para T-25: manuales, informe final de pruebas y video.
