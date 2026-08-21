# 2026-05-20 — Plan marina : requêtes Inertia

Le plan marina (`MarinaMapTab`) utilise désormais `router.patch` (cycle Inertia) au lieu de `fetch` JSON manuel.

- **Frontend** : drag des pontons/mouillages et assignation bateau → place via `router.patch` avec `preserveScroll` ; assignation avec partial reload `only: ['port']`
- **Backend** : `PontoonsController.updatePosition`, `MouillagesController.updatePosition`, `BoatsController.assign` renvoient `response.redirect().back()` (CSRF et validation VineJS inchangés)
