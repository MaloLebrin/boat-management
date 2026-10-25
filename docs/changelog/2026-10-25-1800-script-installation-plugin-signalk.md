# 2026-10-25 — Script d'installation du plugin Signal K (#1021)

Épopée instruments (#986), suite « auto-installation ». Fixe le nom du paquet, le fichier de configuration et l'URL du script que la page publique (#1022), l'assistant (#1023) et le plugin (#1024) réutiliseront.

- **Route.** `GET /install/signalk-plugin.sh` (publique, `text/x-shellscript`, cache 1 h) sert `resources/install/signalk-plugin.sh` via `InstallScriptsController` / `InstallScriptService`. Le marqueur `__FLEETAI_INGEST_ENDPOINT__` devient `${origine}/api/instruments/ingest` : aucun domaine en dur. `/install/` est ajouté à la denylist de navigation du Service Worker et à `robots.txt`.
- **Script.** Idempotent, refuse root (sauf `FLEETAI_ALLOW_ROOT=1`), exige Node, npm, `signalk-server` et le dossier de configuration (code 2 sinon, avec liens vers l'installateur officiel / OpenPlotter — il n'installe pas Signal K). Jeton `FLEETAI_TOKEN` obligatoire (préfixe `fai_ing_`, jamais affiché), `npm install signalk-fleetai@latest`, écriture ou fusion de `plugin-config-data/signalk-fleetai.json`, redémarrage de `signalk.service` s'il est actif. `FLEETAI_DRY_RUN=1` pour les tests.
- **Constantes.** `SIGNALK_PLUGIN_*` dans `shared/constants/instruments.ts` et helper `signalkPluginInstallCommand` dans `shared/helpers/instruments.ts`.
- **Tests.** Fonctionnel de la route, hygiène du vocabulaire (script ↔ constantes ↔ textes), script exécuté en dry-run (refus sans jeton / sans Signal K, config écrite puis fusionnée), helper. `shellcheck resources/install/*.sh` ajouté au job lint de la CI.
- **Docs.** Guide utilisateur (commande + alternative Appstore), domaine instruments, doc dev Signal K, base de connaissance du copilote.
