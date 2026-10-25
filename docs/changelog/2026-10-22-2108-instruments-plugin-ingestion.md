# Instruments : plugin Signal K qui pousse ses relevés (#994)

Date : 2026-10-22

## Ce qui change

- Un bateau sans écran allumé peut maintenant être relié **sans la PWA** : un plugin installé sur le serveur Signal K du bord envoie lui-même ses relevés à FleetAi. L'admin génère un **jeton propre au bateau** depuis la carte « Plugin Signal K » de l'onglet Instruments (régénérer ou révoquer à tout moment). Le jeton n'est **affiché qu'une fois** ; FleetAi n'en conserve que l'empreinte.
- Les relevés reçus par le plugin ont les mêmes effets que ceux de l'application : heures moteur, position, journal de bord, alertes et notifications.

## API

- `POST /api/instruments/ingest` avec `Authorization: Bearer fai_ing_…`, corps JSON identique au lot de la PWA (≤ 500 échantillons, valeurs en unités SI, `recordedAt` ISO 8601 ; `sourceId` facultatif). Réponses JSON : `200 { accepted, ignored }` (un rejeu est un succès), `401` jeton absent/inconnu/révoqué, `403` plan sous Pro, `409` source désactivée, `422` lot invalide, `429` limite de débit (30 lots/min par source, 120/min par IP).
- Pas de session ni de CSRF sur cette route (`config/shield.ts`) ; le contrat complet est dans `docs/domain/instruments.md`. Le plugin lui-même est hors de ce dépôt.

## Technique

- Migration `1892000000000` : `boat_instrument_sources.ingest_token_hash` (sha256, unique, non sérialisé) et `ingest_token_issued_at`.
- `InstrumentIngestTokenService`, `InstrumentIngestTokenMiddleware` (middleware nommé `instrumentIngestToken`), `InstrumentIngestController`, `InstrumentIngestTokensController` ; routes `POST`/`DELETE /boats/:boatId/instrument-source/ingest-token` (admin).
- Les erreurs 429 de `/api/**` sont rendues en JSON avec `Retry-After`.
- Audit : `boat.instrument_ingest_token_issue` / `boat.instrument_ingest_token_revoke`.
- Base de connaissance du copilote : mots-clés « plugin signal k » et « jeton plugin » ajoutés à l'entrée `instruments-signalk`.
