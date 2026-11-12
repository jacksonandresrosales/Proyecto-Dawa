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

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

- API: http://localhost:3000/api/health
- Aplicación: http://localhost:5173

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

## Estructura

```
backend/     API Express: routes → controllers → services → repositories → Prisma
frontend/    React + TypeScript: pages, components (ui = shadcn), hooks, api
docs/ux/       Roles, sitemap, flujos, wireframes, componentes
docs/tecnico/  Arquitectura, modelo de datos, reglas, API, seguridad, backlog
.github/     CI y plantilla de PR
```

## Documentación

- Diseño UX: [docs/ux/README.md](docs/ux/README.md)
- Documento técnico: [docs/tecnico/README.md](docs/tecnico/README.md)
- Cómo colaborar: [CONTRIBUTING.md](CONTRIBUTING.md)

## Equipo

| Integrante | Módulo |
|---|---|
| _nombre_ | Seguridad y usuarios |
| _nombre_ | Clientes, técnicos y catálogos |
| _nombre_ | Solicitudes |
| _nombre_ | Asignación, seguimiento, notificaciones y dashboard |
