# 2026-07-01 — [#195] Sécurité : AuthorizationException de Bouncer re-propagée dans boatSuggestions

**Correction d'une exception de Bouncer avalée silencieusement**

- `app/controllers/ai_controller.ts` : ajout d'un branch `else if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) { throw error }` dans le catch de `boatSuggestions`, avant le `else` générique. Les `AuthorizationException` levées par Bouncer (`bouncer.with(BoatPolicy).authorize('view', boat)`) sont désormais re-propagées au framework (qui les gère avec un redirect + flash `error: Access denied`) au lieu d'être masquées comme une erreur d'analyse.
- `tests/functional/ai/boat_suggestions.spec.ts` : 3 nouveaux tests fonctionnels (unauthentifié → /login, boat not found → redirect silencieux, bouncer deny → redirect + flash `errorsBag.E_AUTHORIZATION_FAILURE`).
