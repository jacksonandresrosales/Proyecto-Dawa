# Documento técnico — ServiGest

| Doc | Contenido |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Capas, carpetas y stack justificado |
| [02-modelo-datos.md](02-modelo-datos.md) | Modelo lógico y físico |
| [03-estados-y-reglas.md](03-estados-y-reglas.md) | Máquina de estados y reglas de negocio |
| [04-api.md](04-api.md) | Contratos REST |
| [05-seguridad.md](05-seguridad.md) | Autenticación, autorización y secretos |
| [06-backlog-equipo.md](06-backlog-equipo.md) | Reparto, plan y checklist del enunciado |
| [Manual técnico](../manuales/manual-tecnico.md) | Instalación, variables, pruebas, despliegue y operación |

## Estado de entrega

El despliegue multi-cloud está operativo: frontend en [Cloudflare Pages](https://servigest-frontend.pages.dev/), API en [Railway](https://carefree-acceptance-production.up.railway.app) y PostgreSQL en Neon. La aplicación y el health check de la API responden correctamente.

En la verificación del 28 de noviembre de 2026, `npm test` pasó con 38 pruebas unitarias, 29 de integración y 18 de frontend; `npm run lint`, `npm run typecheck` y el build de frontend también finalizaron correctamente. La ejecución de integración requiere el servicio `db_test` de Docker Compose disponible en el puerto 5433.

T-25 está completado: están preparados el [manual de usuario](../manuales/manual-usuario.md) y su [PDF](../manuales/Manual_Usuario_ServiGest.pdf), el [manual técnico de operación](../manuales/manual-tecnico.md) y su [PDF](../manuales/Manual_Tecnico_ServiGest.pdf), y el [informe final de pruebas](../informe-pruebas.md) con su [PDF](../Informe_Final_Pruebas_ServiGest_T25.pdf). El video de demostración también está terminado.
