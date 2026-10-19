# 2026-10-19 — Instruments de bord Signal K : socle backend (#988)

Première brique de l'épopée #986 : le modèle de données, l'ingestion idempotente et le gating de plan. Aucun écran : l'onglet « Instruments » arrive avec la PR 3.

- **Données.** Tables `boat_instrument_sources` (serveur Signal K d'un bateau, jeton chiffré) et `boat_telemetry_samples` (append-only, unique `(source_id, path, recorded_at)`, index `(boat_id, path, recorded_at DESC)`).
- **Routes.** `PUT` et `DELETE /boats/:boatId/instrument-source` (admin, capacité `instruments.manage`), `POST /boats/:boatId/telemetry` (`boats.edit`). Succès de l'ingestion sans flash ; refus métier en `flash('error')`.
- **Ingestion.** `TelemetryIngestService.ingest` : liste blanche de chemins, lot de 500 échantillons au plus, `recordedAt` refusé au-delà de 5 minutes dans le futur, insertion `ON CONFLICT DO NOTHING` (un lot rejoué n'insère rien), event `TelemetryIngested`.
- **Plan.** Flag `canConnectInstruments` : Starter non, Pro et Entreprise oui. Message `flash.quota.instrumentsExceeded`, ligne du tableau comparatif de la page tarifs.
- **Fiche bateau.** Prop différée `instruments` (jeton en clair réservé à qui peut ingérer) ; `connect-src` de la CSP étendue par réponse vers l'origine du serveur Signal K.
- **Journal d'audit.** Actions `boat.instrument_source_update` et `boat.instrument_source_delete`.
- **Assistant.** Entrée `instruments-signalk` dans la base de connaissance produit.
- **Tests.** Specs fonctionnelles (sources, ingestion, CSP rejouant Shield), unitaires (policy, service, helper CSP, catalogue), factories.
- **Reste à faire.** Action `ingest-telemetry` de la file hors-ligne et `rejectedType` en PR 2 (le garde du vocabulaire l'impose).
