# 2026-05-21 — Sécurité : corrections SEC-M1 à SEC-M5

**SEC-M1 — Rate limiting** (`@adonisjs/limiter` v3, store database) :

- `POST /login`, `POST /forgot-password`, `POST /reset-password` → 10 req/min par IP (`authThrottle`)
- `POST /ai/chat`, `POST /ai/fleet-analysis`, `POST /ai/boats/:id/suggestions` → 20 req/min par userId/IP (`aiThrottle`)
- Migration : `1779300016000_create_rate_limits_table.ts`

**SEC-M2 — AI Chat** (`app/controllers/ai_controller.ts`, `app/validators/ai.ts`) :

- Validation VineJS : tableau `messages` avec `role: enum(['user','assistant'])` et `content: string.maxLength(4000)`, 1–50 éléments
- Réponse convertie en `session.flash('info')` + `response.redirect().back()` (suppression des `response.badRequest` / `response.accepted` JSON)

**SEC-M3 — cloudinaryPublicId** :

- Supprimé des props Inertia : `app/transformers/boat_transformer.ts`, `app/transformers/media_transformer.ts`, `app/controllers/boat_equipment_controller.ts`, `inertia/types/boat_show.ts`
- Le champ reste accessible côté serveur (Cloudinary download) mais n'est plus sérialisé vers le client

**SEC-M5 — Token de reset** (`app/services/password_reset_service.ts`) :

- Stockage en SHA-256 hex (plus de plain text en base)
- Comparaison avec `crypto.timingSafeEqual` pour éliminer les timing attacks
- Migration : `1779300015000_truncate_password_reset_tokens.ts` (purge des tokens plain-text existants)

---
