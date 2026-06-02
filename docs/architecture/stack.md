# Stack & tooling

## Versions & libs principales

Référence: `package.json`

- **Backend**: AdonisJS v7 (`@adonisjs/core`)
- **Frontend**: Vue 3 + Inertia (`@adonisjs/inertia`, `@inertiajs/vue3`)
- **Build**: Vite (`@adonisjs/vite`, `vite`)
- **DB**: Lucid (`@adonisjs/lucid`)
  - driver principal: **PostgreSQL** (`pg`)
  - driver optionnel: **SQLite** (`better-sqlite3`)
- **Auth**: `@adonisjs/auth` (guard web/session)
- **ACL**: `@adonisjs/bouncer` (abilities)
- **Tests**: Japa (backend), Vitest (frontend Inertia)
- **CSS**: Tailwind

## Package manager

Le repo utilise **pnpm** (règle Cursor: `.cursor/rules/package-manager.mdc`).

Exemples:

- `pnpm dev`
- `pnpm test`
- `pnpm test:inertia`

## Scripts utiles

Référence: `package.json`.

- `dev`: serveur Adonis avec HMR
- `test`: tests backend (Japa)
- `test:inertia`: tests frontend (Vitest)
- `typecheck`: `tsc` + `vue-tsc`
