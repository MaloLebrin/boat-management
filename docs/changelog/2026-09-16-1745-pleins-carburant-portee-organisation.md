# 2026-09-16 — Pleins de carburant : vérification d'organisation dans le service (vague 0.5)

`BoatFuelLogService` était le seul service de sous-ressource bateau à ne pas
vérifier que le bateau appartient à l'organisation de l'utilisateur (ses
paramètres `_user` étaient ignorés). La politique Bouncer faisait ce contrôle
au niveau du contrôleur, mais un appel direct au service (job, assistant IA,
import) passait sans garde-fou.

- **Correctif.** `listForBoat`, `createForBoat` et `deleteForBoat` appellent `assertBoatInUserOrg()` (`app/utils/boat_utils.ts`) et lèvent `BoatNotFoundError` hors organisation — même helper et même erreur que `BoatSailService` et `BoatRigService`.
- **Tests.** `tests/integration/services/boat_fuel_log_service.spec.ts` (4 tests, écrits rouges avant le correctif) : les trois méthodes rejettent un bateau étranger sans rien écrire ni supprimer, et le bateau de sa propre organisation reste accessible.
- **Aucun changement** de route ni de comportement visible : les contrôleurs résolvaient déjà le bateau dans l'organisation de l'utilisateur.
