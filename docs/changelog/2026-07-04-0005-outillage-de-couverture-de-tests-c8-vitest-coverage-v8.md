# 2026-07-04 — Outillage de couverture de tests (c8 + @vitest/coverage-v8)

**Ajoute la mesure de couverture de code, jusqu'ici absente du projet (aucun instrument back ni front).**

- Backend : dépendance dev `c8` + config `.c8rc.json` (instrumente `app/` et `shared/`, exclut tests/build, rapports `text` + `html` dans `coverage/backend`). Script `pnpm test:coverage` (= `c8 node ace test`)
- Frontend : dépendance dev `@vitest/coverage-v8` + bloc `coverage` dans `vitest.config.ts` (provider `v8`, cible `inertia/**`, rapports dans `coverage/frontend`). Script `pnpm test:inertia:coverage` (= `vitest run --coverage`)
- `.gitignore` : le dossier `coverage/` est ignoré
- Aucun seuil bloquant en CI : l'outillage est disponible en local pour suivre la progression, sans faire échouer le build
