# 2026-07-03 — [#180] Navigation : l'update partiel n'efface plus les champs optionnels

**Corrige D-05 : le contrôleur convertissait `undefined → null` (`?? null`) pour `windForceBeaufort`, `seaState`, `crewCount`, `notes`. Le service protège ces champs via `!== undefined`, mais `null !== undefined` est vrai — donc chaque update partiel écrasait à `null` les champs non fournis**

- `app/controllers/navigation_logs_controller.ts` (`update()`) : passe désormais `payload.windForceBeaufort` (etc.) directement, sans `?? null`. Un champ absent (`undefined`) est préservé par le service ; un champ explicitement vidé (`null`) est effacé
- `app/validators/navigation_log.ts` : `updateNavigationLogValidator` — les 4 champs deviennent `.nullable().optional()`, de sorte qu'un champ vidé côté formulaire (`''` → `null` via `convertEmptyStringsToNull`) est une valeur de « vidage » valide et non une erreur de validation
- Tests ajoutés : `tests/functional/boats/navigation_logs.spec.ts` (update partiel préserve les champs non fournis ; un champ vidé est bien mis à `null`)
