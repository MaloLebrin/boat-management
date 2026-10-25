# Instruments : prévisions météo du serveur Signal K du bord (#1010)

Date : 2026-10-25

## Ce qui change

- L'onglet **Instruments** affiche les **prévisions météo** du serveur Signal K du bord quand un fournisseur météo (Open-Meteo, Meteoblue…) y est installé : vent, rafales, vagues, pression, pluie et température, sur **24, 48 ou 72 h**, avec un résumé (extrêmes et pluie cumulée) et une courbe par mesure.
- Elles sont lues **directement par l'application** sur le Wi-Fi du bord, à partir de la dernière position connue du bateau. Rien n'est stocké côté FleetAi : la dernière prévision reste lisible hors-ligne et passe en **« périmée » après 12 h**.
- Un bouton « Actualiser » relance la lecture ; les cas d'échec (position inconnue, API météo absente, aucun fournisseur, jeton refusé, serveur injoignable) sont expliqués sans masquer la dernière prévision connue.

## Technique

- Aucune route, migration ni modèle. Client pur `inertia/lib/signalk/weather.ts` (`GET /signalk/v2/api/weather/_providers` puis `forecasts/point`), composable `use_signalk_forecast`, composants `InstrumentForecastPanel` / `Summary` / `Charts`.
- Types dans `shared/types/weather.ts`, constantes dans `shared/constants/weather.ts`, clés i18n `instruments.forecast.*` (FR/EN), entrée `instruments-signalk` de la base de connaissance du copilote mise à jour.
- Réserve : la forme des réponses suit la spécification Signal K v2 et reste à confirmer sur un serveur réel. La page marketing n'est pas modifiée.
