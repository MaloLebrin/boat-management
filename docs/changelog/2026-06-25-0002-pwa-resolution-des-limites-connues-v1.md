# 2026-06-25 — PWA : résolution des limites connues V1

Résolution des 4 limites documentées dans `docs/frontend/pwa.md`.

**Limit 2 — Page hors-ligne pour les pages non visitées :**

- `public/offline.html` : page statique servie par le Service Worker quand une navigation échoue (page jamais mise en cache)
- `vite.config.ts` : `navigateFallback: '/offline.html'` + `navigateFallbackDenylist` pour exclure `/api/`, `/up`, `/_inertia`
- `offline.html` ajouté aux `globPatterns` pour garantir sa mise en cache

**Limit 3 — Erreur 5xx ne bloque plus la file :**

- `use_offline_queue.ts` : ajout d'un flag `settled` + `onFinish` safety-net — si ni `onSuccess` ni `onError` ne s'est déclenché (cas 5xx / réseau), `isSyncing` est réinitialisé et l'action reste en file pour le prochain retry
- Tests : cas 5xx couvert dans `use_offline_queue.spec.ts`

**Limit 4 — Formulaires d'édition offline-aware :**

- `NavigationLogUpdateForm.vue` : converti de `<Form>` en `useForm` + `form.patch` + chemin offline (enqueue avec `method: 'patch'`)
- `NavigationLogCloseForm.vue` : même conversion, champ `arrivedAt` contrôlé via `v-model`
- Tests : `navigation_log_update_form.spec.ts` + `navigation_log_close_form.spec.ts`

**Limit 1 — Détection de conflit (last-write-wins) :**

- `shared/types/navigation_log.ts` : `updatedAt` ajouté à `NavigationLogRow` ; `expectedUpdatedAt?` ajouté à `UpdateNavigationLogPayload` et `CloseNavigationLogPayload`
- `app/transformers/boat_transformer.ts` : `updatedAt` exposé dans `toNavigationLog()`
- `app/exceptions/navigation_log_errors.ts` : `NavigationLogConflictError`
- `app/services/navigation_log_service.ts` : vérification `expectedUpdatedAt` dans `updateForBoat()` et `closeTrip()`
- `app/controllers/navigation_logs_controller.ts` : lecture de `_expectedUpdatedAt` (champ brut, hors validation VineJS) + gestion `NavigationLogConflictError`
- Flash i18n `flash.navigationLog.conflict` en FR et EN
- Les formulaires d'édition incluent `_expectedUpdatedAt: log.updatedAt` dans le payload offline
