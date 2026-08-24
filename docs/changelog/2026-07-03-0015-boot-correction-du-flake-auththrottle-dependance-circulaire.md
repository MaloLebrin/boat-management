# 2026-07-03 — Boot : correction du flake `authThrottle` (dépendance circulaire preload)

**Corrige une erreur de démarrage intermittente `ReferenceError: Cannot access 'authThrottle' before initialization` (`start/routes/auth.ts`) qui faisait échouer ~50 % des runs de tests et rendait la CI flaky**

- Cause : les preloads d'`adonisrc.ts` sont importés en parallèle (`Promise.all`). `#start/limiter` dépend d'un module à top-level await (`@adonisjs/limiter/services/main` → `await app.booted`). En figurant à la fois comme preload et comme dépendance du graphe des routes, il devenait une seconde racine concurrente, ouvrant une fenêtre où `authThrottle` était lu en TDZ avant son initialisation
- Correctif : retrait de `() => import('#start/limiter')` des `preloads` (il était redondant — le module est chargé comme dépendance de `start/routes/auth.ts`, `ai.ts`, `demo.ts`). L'évaluation devient déterministe ; le throttling reste fonctionnel
- Vérifié : 8/8 runs du test canary sans flake (avant : ~50 % d'échec), tests auth (routes protégées par `authThrottle`) 12/12
