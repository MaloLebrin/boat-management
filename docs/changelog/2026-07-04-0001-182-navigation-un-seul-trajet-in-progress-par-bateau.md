# 2026-07-04 — [#182] Navigation : un seul trajet `in_progress` par bateau

**Corrige D-07 : `createForBoat` insérait un trajet sans vérifier qu'un trajet `in_progress` existait déjà pour ce bateau, et aucun index n'empêchait le doublon. Deux trajets `in_progress` → ambiguïté sur le trajet actif et corruption des heures moteur aux deux `closeTrip`**

- `app/exceptions/navigation_log_errors.ts` : nouvelle erreur métier `NavigationLogInProgressError`
- `app/services/navigation_log_service.ts` (`createForBoat`) : vérifie l'absence de trajet `in_progress` avant de créer ; en cas de course, la violation de l'index unique partiel est aussi convertie en `NavigationLogInProgressError`
- `database/migrations/1807000000000_add_one_in_progress_per_boat_index_to_navigation_logs.ts` : index **partiel unique** `one_in_progress_per_boat` sur `navigation_logs (boat_id) WHERE status = 'in_progress'` (garde de concurrence côté base). La migration clôture d'abord d'éventuels doublons existants (garde le trajet `in_progress` le plus récent par bateau) pour pouvoir créer l'index
- `app/controllers/navigation_logs_controller.ts` : `store()` attrape l'erreur → `flash.navigationLog.alreadyInProgress`
- `resources/lang/en/flash.json` et `fr` : clé `navigationLog.alreadyInProgress`
- Tests ajoutés : `tests/functional/boats/navigation_logs.spec.ts` (un 2ᵉ trajet `in_progress` est refusé avec flash, un seul reste ; une nouvelle sortie est autorisée une fois la précédente clôturée)
