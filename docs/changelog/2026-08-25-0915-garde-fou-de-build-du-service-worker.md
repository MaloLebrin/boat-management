# 2026-08-25 — Garde-fou de build : test de non-régression du service worker (#483)

C'est l'absence de ce test qui a laissé passer #482 : le service worker ne s'installait plus en production et rien ne le signalait — les specs Vitest existantes testent les composables, jamais l'artefact généré par Workbox.

- **Script** `scripts/check_sw_build.mjs` (`pnpm check:sw`), exécuté sur le build réel : `build/public/sw.js` présent à la racine web ; évaluation du SW dans un contexte mocké `node:vm` avec shim `importScripts` pour résoudre le chunk AMD `workbox-*.js` (les erreurs Workbox type `non-precached-url` arrivent en rejet de promesse, capté aussi) ; listeners `install`/`activate`/`fetch` enregistrés ; `/offline.html` dans le manifeste de précache ; bundle client qui enregistre `/sw.js` avec un scope `/` (et ne référence plus `/assets/sw.js`).
- **CI.** Étape « Garde-fou service worker » ajoutée au job `build` de `.github/workflows/ci.yml`, après `pnpm run build`.
- **Validation.** Régression provoquée volontairement (configuration pré-#482 restaurée puis rebuild) : le garde-fou échoue sur les trois fronts avec des messages exploitables — `non-precached-url :: [{"url":"/offline.html"}]`, `/offline.html` absent du manifeste, bundle client référençant `/assets/sw.js`.
- **Doc.** Section « Garde-fou de build » ajoutée à `docs/frontend/pwa.md`.
