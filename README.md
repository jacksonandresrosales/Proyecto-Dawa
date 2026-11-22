# ServiGest

Plataforma web para gestionar solicitudes de servicio técnico, asignar técnicos y dar seguimiento operativo. Proyecto integrador de Desarrollo de Aplicaciones Web Avanzado — Universidad de Guayaquil, 2026 C2.

## Stack

| Parte | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL + Prisma |
| Pruebas | Vitest, Supertest, Testing Library, Playwright |

## Requisitos

- Node.js 22 o superior
- Docker Desktop (para PostgreSQL)

## Ejecución local

```bash
docker compose up -d
```

```bash
npm install
```

Copiar `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env`. Luego:

```bash
npm run migrate
```

Configura un `JWT_SECRET` aleatorio de al menos 32 caracteres en
`backend/.env`. Inicia backend y frontend; en la primera visita a
`http://localhost:5173/login`, usa **Primera vez: crear administrador inicial**
para crear la cuenta y entrar. Esa configuración solo funciona mientras no
exista ningún administrador. Después, las cuentas restantes las crea el admin
desde la aplicación. No hay registro público.

Como alternativa para entornos controlados, `npm run seed` crea los roles,
estados y prioridades; si se definen `INITIAL_ADMIN_EMAIL` e
`INITIAL_ADMIN_PASSWORD`, también crea la cuenta inicial.

Para desarrollo y demostraciones, `npm run seed:demo` carga además usuarios de
todos los roles y 40 solicitudes con historial, asignaciones y notificaciones.
Las cuentas son `admin@servigest.test`, `coordinador1@servigest.test`,
`coordinador2@servigest.test`, `tecnico1@servigest.test` … `tecnico5@servigest.test`
y `cliente1@servigest.test` … `cliente4@servigest.test`, con la contraseña
`ServiGest2026` (o la de la variable `DEMO_PASSWORD`). No se ejecuta con
`NODE_ENV=production`.

Después de traer cambios que agregan migraciones, vuelve a ejecutar
`npm run migrate`: aplica la migración y regenera el cliente de Prisma. Si el
backend está corriendo, detenlo antes; en Windows bloquea el archivo del cliente.

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

- API: http://localhost:3000/api/health
- Aplicación: http://localhost:5173
- Inicio de sesión: http://localhost:5173/login
- Configuración inicial: http://localhost:5173/configurar

## Pruebas y calidad

| Comando | Qué ejecuta |
|---|---|
| `npm test` | Unitarias e integración del backend + pruebas del frontend |
| `npm run test:unit` | Unitarias del backend (no necesitan base de datos) |
| `npm run test:int` | Integración del backend contra la base `db_test` (puerto 5433) |
| `npm run test:front` | Componentes del frontend |
| `npm run test:e2e` | Flujos de extremo a extremo con Playwright |
| `npm run lint` | ESLint en todo el repositorio |
| `npm run typecheck` | Tipos de TypeScript del frontend |

La primera vez que se usan las pruebas E2E: `npx playwright install chromium`.
Las E2E recorren los dos flujos del enunciado en la app real ("registro → asignación → atención" y "consulta → seguimiento → cierre"), así que necesitan el backend corriendo con los datos de `npm run seed:demo`. El frontend lo levanta Playwright si no está abierto.

## Estructura

```
backend/     API Express: routes → controllers → services → repositories → Prisma
frontend/    React + TypeScript: pages, components (ui = shadcn), hooks, api
docs/ux/       Roles, sitemap, flujos, wireframes, componentes
docs/tecnico/  Arquitectura, modelo de datos, reglas, API, seguridad, backlog
```

## Documentación

- Diseño UX: [docs/ux/README.md](docs/ux/README.md)
- Documento técnico: [docs/tecnico/README.md](docs/tecnico/README.md)

## Equipo

| Integrante | Módulo |
|---|---|
| _nombre_ | Seguridad y usuarios |
| _nombre_ | Clientes, técnicos y catálogos |
| _nombre_ | Solicitudes |
| _nombre_ | Asignación, seguimiento, notificaciones y dashboard |
