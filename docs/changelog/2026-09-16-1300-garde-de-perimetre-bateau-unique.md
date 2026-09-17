# Garde de périmètre bateau unique

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.5.

## Problème

La condition « le bateau appartient à l'organisation de l'utilisateur »
(`user.organizationId === null || user.organizationId !== boat.organizationId`)
existait en sept exemplaires : `assertBoatInUserOrg` dans `app/utils/boat_utils.ts`,
cinq copies locales `assertBoatScope` (réservations, incidents, actions
d'équipement, fiches d'entretien, tâches d'entretien) qui ne différaient que par
l'erreur levée, et deux checks inline dans `BoatMaintenanceService`.

## Changement

- `assertBoatInUserOrg(user, boat, makeError?)` accepte une fabrique d'erreur ;
  par défaut `BoatNotFoundError`, comme avant. La fabrique n'est appelée que si
  le check échoue.
- Les cinq copies et les deux checks inline sont remplacés par un appel au
  helper avec l'erreur de leur domaine (`ReservationNotFoundError`,
  `BoatIncidentNotFoundError`, `BoatEquipmentActionNotFoundError`,
  `BoatMaintenanceSheetNotFoundError`, `BoatMaintenanceTaskNotFoundError`,
  `BoatMaintenanceValidationError('invalidBoat')` et
  `BoatMaintenanceNotFoundError`). Les erreurs levées sont strictement les
  mêmes qu'avant : le handler global et les contrôleurs n'y voient aucune
  différence.

## Tests

- `tests/unit/utils/boat_utils.spec.ts` (5 tests) : erreur par défaut, erreur
  fournie par l'appelant (rouge avant), utilisateur sans organisation, fabrique
  non appelée quand le check passe.
- `tests/integration/services/boat_scope.spec.ts` (8 tests, verts avant et
  après) : caractérisation du contrat cross-organisation des six services —
  trois d'entre eux (réservations, incidents, actions d'équipement) n'avaient
  aucun test d'intégration de ce cas.
- Suites `services/boat_maintenance_*` et backend complète inchangées.
