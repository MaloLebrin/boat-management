# Instruments : historique, graphiques et rétention (#992)

Date : 2026-10-22

## Historique

- Dans l'onglet **Instruments** de la fiche bateau, un panneau « Historique » trace les mesures numériques (vitesse, régime, tension, niveaux, vent, profondeur…) sur **1 heure, 24 heures ou 7 jours**. Jusqu'à 6 mesures à la fois, une courbe par mesure, dans l'unité d'affichage (nœuds, °C, bar…), avec le thème clair/sombre.
- Données : moyennes par seau de temps (`date_bin` : 1 min, 15 min, 1 h selon la plage). Prop optionnelle `instrumentSeries` de `GET /boats/:id`, chargée à la demande (`?range=24h&paths[]=…`, rechargement partiel Inertia) ; une demande invalide donne une série vide.

## Rétention

- Nouveau job quotidien `PurgeTelemetrySamples` (01:15) : supprime les relevés plus vieux que la durée du plan — **Pro 90 jours, Entreprise 365 jours**, 30 jours pour un bateau rétrogradé en Starter.
- Durées dans `shared/constants/data_retention.ts` (`TELEMETRY_SAMPLE_RETENTION_DAYS`), à valider avec le coût de stockage réel.

## Tests

`telemetry_series.spec.ts` (seaux, bornes, isolation par bateau, prop optionnelle), `purge_telemetry_samples.spec.ts`, `parseSeriesQuery`, Vitest `instrument_history_panel.spec.ts`.
