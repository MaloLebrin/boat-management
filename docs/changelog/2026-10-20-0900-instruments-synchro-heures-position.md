# 2026-10-20 — Instruments : heures moteur, position et journal de bord (#991)

Quatrième brique de l'épopée #986. La télémétrie reçue ne reste plus dans l'onglet Instruments : elle alimente les heures moteur, l'historique de position et le journal de bord.

- **Heures moteur.** Un moteur reçoit un « Identifiant instruments » (l'`<id>` de `propulsion.<id>.runTime` côté Signal K, unique par bateau). Les heures avancent des heures **entières** écoulées depuis la dernière lecture ; le compteur absolu du calculateur n'est jamais recopié dans les heures du moteur. Un calculateur remis à zéro re-base sans toucher aux heures, et rejouer un lot ne compte rien en double.
- **Position.** `navigation.position` (avec vitesse et cap du même lot) met à jour la position du bateau : en place tant que le bateau reste à moins de 100 m et que la ligne a moins de 5 min, sinon nouvelle ligne `gps`.
- **Journal de bord.** Pendant une sortie en cours, un point automatique est ajouté toutes les 10 minutes (cap, vitesse, vent réel, profondeur, température de l'eau) et signalé par un badge « Instruments ».
- **Clôture de sortie.** Les heures du moteur tenu par les instruments sont préremplies.
- **Technique.** Migration `add_instrument_sync_columns` (`boat_engines.instrument_key`, `instrument_run_time_s`, `navigation_log_entries.source`) ; listener `OnTelemetryIngested` (une panne de synchro est journalisée sans refuser le lot) ; services `EngineHoursSyncService`, `PositionSyncService`.
- **Tests.** Japa : décision de synchro (base, delta, reset, report), parcours complet lot → heures / position / journal, rejeu, identifiant moteur, listener ; Vitest : champ du formulaire moteur, préremplissage de la clôture, badge.
