# Gestor de Tareas y Proyectos

Proyecto final - Aseguramiento de la Calidad del Software (UMG)

## Stack
- Frontend: Vite + React 18 + TailwindCSS + React Router
- Backend: Node + Express + Prisma
- Base de datos: MySQL 8 (Docker)

## Requisitos
Node 20+, Git y Docker Desktop (abierto y corriendo).

## Cómo levantar el proyecto

```powershell
git clone https://github.com/rinterianoo/trello.git
cd trello
git checkout develop
docker compose up -d
cd backend
Copy-Item .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Verifica que responda: http://localhost:3000/api/health → `{"ok":true}`

## Flujo de trabajo con Git
- `main`: rama protegida, solo se entra por Pull Request.
- `develop`: rama de integración.
- Cada quien trabaja en `feature/nombre-funcionalidad` creada desde `develop`.
- Commits semánticos: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Antes de empezar cada día: `git checkout develop` y `git pull`.

## Reglas de equipo
- Nunca subir `.env` (solo `.env.example`).
- Solo una persona modifica `schema.prisma` a la vez (avisar en el grupo).
- Si cambia el esquema: `git pull` y luego `npx prisma migrate dev`.
