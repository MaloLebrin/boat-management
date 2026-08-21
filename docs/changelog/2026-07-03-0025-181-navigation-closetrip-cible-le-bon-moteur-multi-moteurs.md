# 2026-07-03 — [#181] Navigation : `closeTrip` cible le bon moteur (multi-moteurs)

**Corrige D-06 : sur un bateau multi-moteurs, `closeTrip` mettait toujours à jour le moteur au plus petit `id` (`orderBy('id','asc').first()`), quel que soit le moteur réellement utilisé — compteur d'heures faux, erreurs de maintenance préventive**

Règle métier validée : _moteur ciblé, sinon mono-moteur seulement_.

- `shared/types/navigation_log.ts` : ajout de `boatEngineId?: number | null` dans `CloseNavigationLogPayload`
- `app/validators/navigation_log.ts` : `closeNavigationLogValidator` accepte `boatEngineId` (entier positif, nullable)
- `app/services/navigation_log_service.ts` (`closeTrip`) : si `boatEngineId` est fourni → seul ce moteur (actif, du bateau) est mis à jour ; sinon → mise à jour uniquement s'il existe **exactement un** moteur actif. Sur un bateau multi-moteurs sans moteur précisé, **aucun** moteur n'est modifié (plus de compteur faux). Le garde anti-régression des heures (#174) est conservé
- `app/controllers/navigation_logs_controller.ts` : passe `boatEngineId`
- **Frontend** : `NavigationLogCloseForm.vue` affiche un sélecteur de moteur quand le bateau a >1 moteur actif (`boatEngineId`) ; helper réutilisable `inertia/utils/navigation_engine_options.ts` ; câblage via `BoatShowTabNavigationLogs.vue` et `NavigationActiveCard.vue`
- `resources/lang/en/navigation_logs.json` et `fr` : clés `fields.boatEngine`, `fields.selectEngine`
- Tests ajoutés :
  - backend `tests/functional/boats/navigation_logs.spec.ts` (multi-moteurs sans `boatEngineId` → aucun moteur touché ; `boatEngineId` fourni → seul le moteur ciblé mis à jour ; mono-moteur inchangé)
  - frontend `tests/inertia/navigation_engine_options.spec.ts` (helper : filtre les moteurs hors service, label brand/model, fallback `#id`) et `tests/inertia/navigation_log_close_form.spec.ts` (sélecteur affiché si >1 moteur, masqué sinon)
