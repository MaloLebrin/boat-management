# 2026-10-25 — Route PATCH pour relier un moteur à son identifiant Signal K (#1020)

Socle de l'assistant d'installation (#1023, épopée #986) : relier « moteur Bâbord ↔ `port` » sans renvoyer tout le formulaire moteur.

- **Route.** `PATCH boats/:boatId/engines/:engineId/instrument-key`, corps `{ instrumentKey: string | null }` (segment `[A-Za-z0-9_-]`, 40 caractères max ; `null` ou vide détache). Droit `boats.edit`.
- **Service.** `BoatEngineService.setInstrumentKey`, factorisé avec `update` : clé unique par bateau, base `instrument_run_time_s` effacée quand la clé change.
- **Réponse.** Redirection vers le referer ; flash `flash.engine.instrumentKeySaved` (EN/FR) ou `flash.engine.instrumentKeyTaken`.
- **Front.** `BoatShowTabContent` passe `engines` à `BoatShowTabInstruments` (prop seule, aucun changement d'affichage).
- **Tests.** `tests/functional/instruments/engine_instrument_key.spec.ts`.
