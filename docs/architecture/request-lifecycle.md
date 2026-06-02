# Lifecycle d’une requête (HTTP → Inertia)

## Middlewares (ordre)

Référence: `start/kernel.ts`.

### Server middleware

- `container_bindings_middleware`
- `@adonisjs/static/static_middleware`
- `@adonisjs/cors/cors_middleware`
- `@adonisjs/vite/vite_middleware`
- `#middleware/inertia_middleware`

### Router middleware

- `@adonisjs/core/bodyparser_middleware`
- `@adonisjs/session/session_middleware`
- `@adonisjs/shield/shield_middleware` (désactivé en test)
- `@adonisjs/auth/initialize_auth_middleware`
- `#middleware/silent_auth_middleware`
- `#middleware/initialize_bouncer_middleware`

## Auth & guest

Référence: `start/kernel.ts` (middleware nommés) et `start/routes/auth.ts`.

- `middleware.guest()` protège les pages signup/login (accès seulement si non-authentifié).
- `middleware.auth()` protège le reste des routes métier (ex: `start/routes/boats.ts`).

## ACL (Bouncer)

Référence: `app/abilities/main.ts`.

- Abilities déclarées: `boatView`, `boatCreate`, `boatUpdate`, `boatDelete`
- Règle principale: **même organisation** (user.organizationId == boat.organizationId)

## Inertia

Référence: `inertia/app.ts` et `config/inertia.ts`.

- SSR: désactivé (`config/inertia.ts` → `ssr.enabled=false`)
- Résolution pages: `inertia/pages/**/*.vue` avec layout par défaut `inertia/layouts/default.vue`
