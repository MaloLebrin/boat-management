# 2026-08-28 — Route de healthcheck `GET /up` (#541)

Les plateformes d'hébergement (Koyeb, Render, Fly, healthcheck Docker, `reverse_proxy` Caddy) ont besoin d'un endpoint de santé. `/up` était déjà exclu du service worker (`inertia/sw.ts`) mais la route n'existait pas.

- **Route.** `GET /up` (`start/routes/health.ts`, importée en tête de `start/routes.ts`) — publique, sans `middleware.auth()` et sans throttle : les probes l'appellent toutes les quelques secondes.
- **Logique.** `HealthService.check()` exécute un `select 1` : il valide à la fois l'ouverture du pool Postgres et la réponse de la base. L'erreur n'est jamais propagée — la probe doit répondre 503, pas afficher une page 500. Le controller reste fin.
- **Réponse.** JSON assumé (`{ status, checks: { database } }`, type dans `shared/types/health.ts`) : c'est une probe consommée par Docker et les PaaS, pas un écran Inertia. 200 si la base répond, 503 sinon.
- **Tests.** `tests/functional/health/up.spec.ts` — 200 + corps `ok` sur une app saine, 503 quand `HealthService` est remplacé par un double en échec.
