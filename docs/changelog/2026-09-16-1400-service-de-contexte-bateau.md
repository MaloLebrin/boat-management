# Résolution du bateau de la route partagée : `BoatContextService`

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.4.

## Problème

Chaque contrôleur « sous » un bateau (`/boats/:boatId/…`) portait sa copie de
la même méthode privée : lire l'utilisateur, charger le bateau via
`BoatHullService.getForUserOrFail`, attraper `BoatNotFoundError`, rediriger
vers `/boats` et renvoyer `null`. Douze copies identiques (`loadBoat`,
`loadBoatForEquipment`), deux `resolve()` identiques bateau + réservation
(inspections, contrats de location), une variante dans le journal de
navigation et quatre blocs inline dans l'export CSV : 471 lignes pour un seul
contrat.

## Changement

- Nouveau `app/services/boat_context_service.ts` :
  - `resolveBoat(ctx, param = 'boatId')` → `{ user, boat }` ou `null` après
    redirection vers `/boats` (bateau inexistant ou étranger à l'organisation) ;
    `param` permet `id` sur les routes de la ressource bateau (export CSV) ;
  - `resolveBoatAndReservation(ctx)` → `{ user, boat, reservation }` ; une
    réservation absente redirige vers `/boats/:boatId/reservations`.
  - Toute autre erreur remonte au handler global, comme avant.
- Types du contexte dans `shared/types/boat_context.ts` (`BoatContext<U, B>`,
  `BoatReservationContext<U, B, R>`), génériques parce que `shared/types` est
  inclus par le tsconfig du front et ne peut pas importer les modèles Lucid.
- Seize contrôleurs migrés ; les méthodes privées disparaissent, les appels
  deviennent `this.boatContext.resolveBoat({ auth, response, params })`. Les
  injections `BoatHullService` / `BoatReservationService` qui ne servaient
  qu'à cela sont retirées. Aucune route, redirection ni prop ne change.
- Restent volontairement hors périmètre : les résolutions inline de
  `boats_controller.ts` (découpé en 2.6), et celles des contrôleurs qui
  enchaînent d'autres erreurs dans le même `try` (budget, incidents, tâches…),
  à traiter avec `BoatContextService` quand ces contrôleurs seront revus.

## Tests

- `tests/unit/services/boat_context_service.spec.ts` (7 tests, écrits avant le
  service) : bateau résolu, paramètre de route alternatif, redirection
  `/boats` et `null`, erreur inattendue propagée, réservation résolue,
  redirection vers la liste des réservations, arrêt au bateau sans chercher la
  réservation.
- Caractérisation existante conservée : suites fonctionnelles `boats/*`,
  `navigation/*`, `spare_parts/*`, `rental_contracts`, `inspections`,
  `csv_export`, `media`, `documents` (redirections 404 → `/boats` déjà
  couvertes).
- `pnpm lint`, `tsc -b`, `node ace build`, suite backend complète verts.
