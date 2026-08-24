# 2026-07-19 — Page 403 dédiée pour les refus Bouncer (#395)

Tout refus Bouncer (403, `E_AUTHORIZATION_FAILURE`) rendait une page brute « Access denied », sans layout ni i18n, y compris en production (un mécanicien cliquant sur « Clients »/« Factures », ou un `boat_owner` ouvrant `/boats/:id`).

- `app/exceptions/handler.ts` : ajout de la plage `'401..403'` dans `statusPages`, rendant `errors/forbidden` (au même titre que `'404'`/`'500..599'` déjà en place — comportement production-only via `renderStatusPages = app.inProduction`, inchangé).
- Nouvelle page `inertia/pages/errors/forbidden.vue` (layout `PublicLayout`, lien de retour `/dashboard` via `<Link>`), clés `errors.forbidden.{title,description,action}` dans `resources/lang/{en,fr}/errors.json`.
- **Tests** : `tests/unit/exceptions/handler.spec.ts` (la plage `401..403` route bien vers `errors/forbidden`), `tests/inertia/errors_forbidden.spec.ts` (rendu du titre/description/lien).
- Lié à #397 (masquage en amont des liens de nav menant à des 403) — hors périmètre de cette PR.
