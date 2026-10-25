# Instruments : cibles AIS sur la fiche bateau (#1009)

Date : 2026-10-25

## Ce qui change

- L'onglet **Instruments** (plans Pro et Entreprise) affiche les **navires AIS** reçus par le serveur Signal K du bord : liste triée par distance (nom ou MMSI, type, distance en milles, vitesse en nœuds, cap, CPA/TCPA) ou **carte**. Un badge « À surveiller » / « Risque » signale un point de plus courte approche proche (≤ 0,5 NM) et imminent (≤ 20 min), d'après `navigation.closestApproach` du serveur — FleetAi ne recalcule pas le CPA.
- À l'écran : 50 cibles au plus (les plus proches), rafraîchies toutes les 5 secondes ; une cible muette depuis 10 minutes disparaît. Hors flux, l'onglet montre les derniers relevés enregistrés (30 dernières minutes).
- Les cibles sont **enregistrées** (un relevé par cible et par fenêtre de 5 minutes) et **purgées** après 7 jours (Pro) ou 30 jours (Entreprise). Ce sont des données de navires tiers : lisibles par l'équipe du bateau seulement, mentionnées dans la politique de confidentialité.

## Technique

- Migration `1893000000000` : table `boat_ais_sightings` (unique `(source_id, mmsi, recorded_at)`, index `(boat_id, recorded_at)`), modèle `BoatAisSighting`, service `AisTargetService`.
- Aucun nouveau contrat : une cible est un échantillon `ais.<mmsi>` (valeur structurée) du lot de télémétrie existant. La route PWA, `POST /api/instruments/ingest`, la file hors ligne et l'idempotence sont inchangées ; un lot est toujours accepté ou refusé en entier (≤ 500 échantillons au total).
- Client : second abonnement Signal K sur `vessels.*` (`aisSubscriptionSpecs`), `ais_tracker.ts`, composable `use_ais_targets`, composants `InstrumentAisPanel` et `InstrumentAisMap` ; clés `instruments.ais.*` (FR/EN).
- Rétention : `AIS_SIGHTING_RETENTION_DAYS` purgée par `TelemetryRetentionService` (job `PurgeTelemetrySamples`). Prop différée `instruments.aisTargets`.
- Politique de confidentialité : puce `s6_b6` (durée de conservation), fixtures marketing mises à jour.
- Base de connaissance du copilote : mots-clés « ais », « cibles ais », « cpa » ajoutés à l'entrée `instruments-signalk`. La page marketing n'est pas modifiée (à faire une fois la fonction livrée).
