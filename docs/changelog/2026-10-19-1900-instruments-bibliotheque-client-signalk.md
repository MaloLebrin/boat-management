# 2026-10-19 — Instruments de bord : bibliothèque client Signal K et synchronisation (#989)

Deuxième brique de l'épopée #986, **sans interface** : tout ce qu'il faut côté navigateur pour lire un serveur Signal K et envoyer ses mesures à FleetAi. L'onglet « Instruments » qui les affiche arrive avec la PR 3 (#990).

- **Bibliothèque `inertia/lib/signalk/`.** Client (découverte, sonde d'authentification, WebSocket, reconnexion plafonnée à 30 s, heartbeat), normaliseur de deltas, catalogue de cadences, conversions d'unités (le régime Signal K est en hertz), agrégateur à fenêtres, persistance IndexedDB de la fenêtre en cours.
- **Composables.** `use_instrument_stream` (valeurs en direct, valeurs périmées, Wake Lock, flux coupé quand la page passe en arrière-plan) et `use_telemetry_sync` (agrégation, envoi par lots de 500 au plus, file hors-ligne au besoin).
- **File hors-ligne.** Nouvelle option `silent` : pas de toast à l'ajout ni de bilan, mais l'action reste comptée dans la file. Nouvelle action `ingest-telemetry` (libellés EN/FR), dont le contrôleur renvoie désormais `rejectedType` sur un refus.
- **Tests.** Vitest : client avec faux serveur (découverte, jeton, 401, repli, heartbeat), agrégateur, normaliseur, unités, flux, synchro (en ligne, hors-ligne, plafond, rechargement) et option `silent` de la file.
