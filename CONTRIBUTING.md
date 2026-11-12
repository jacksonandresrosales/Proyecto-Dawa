# Cómo colaborar

El enunciado exige aportes individuales verificables en Git. Estas reglas existen para eso.

## Ramas

- `main`: siempre funciona; es lo que se despliega y se defiende.
- `develop`: integración de la semana.
- `feat/<modulo>-<descripcion>`, `fix/<descripcion>`, `docs/<descripcion>`: una rama por tarea del backlog, creada desde `develop`.

No se hace push directo a `main` ni a `develop`.

## Commits

Cada integrante hace commits con su propia cuenta. Formato:

```
tipo(módulo): qué cambia

feat(solicitudes): registrar solicitud con código único
fix(asignacion): rechazar técnico con carga máxima
test(sla): casos de plazo por vencer
docs(api): ejemplos de errores
```

Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.

## Pull requests

1. Abrir el PR hacia `develop` usando la plantilla.
2. La CI debe pasar (lint, tipos, pruebas, build).
3. Lo revisa y aprueba **otro** integrante. Quien revisa debe poder explicar el cambio: en la defensa cualquiera puede recibir preguntas sobre cualquier módulo.
4. Usar merge normal, no "Squash and merge": así se conservan los commits de cada autor.

## Antes de pedir revisión

- `npm run lint`, `npm run typecheck` y `npm test` pasan en local.
- Si cambia una regla de negocio, cambia o se agrega su prueba.
- Si cambia un endpoint, se actualiza `backend/openapi.yaml` y `docs/tecnico/04-api.md`.
- Si cambia el esquema, hay una migración nueva (no se editan migraciones ya aplicadas).

## Dónde va cada cosa

| Quiero… | Va en… |
|---|---|
| Una regla de negocio | `backend/src/services/` |
| Una consulta a la base | `backend/src/repositories/` |
| Validar la forma de una petición | `backend/src/validators/` |
| Restringir por rol | `requireRole(...)` en `backend/src/routes/` |
| Una pantalla | `frontend/src/pages/` |
| Algo que se repite entre pantallas | `frontend/src/components/` |
