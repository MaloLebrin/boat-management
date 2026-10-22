# Instruments : alertes et anomalies (#993)

Date : 2026-10-22

## Ce qui change

- Les instruments d'un bateau déclenchent maintenant des **alertes**. Règles intégrées, toujours actives : batterie sous 20 % de charge, température moteur au-dessus de 95 °C, profondeur sous quille inférieure à 1,5 m, et toute alarme Signal K (`alarm` / `emergency`). Chaque alerte se lève d'elle-même quand la valeur revient au-delà d'une marge (hystérésis) — pas de clignotement autour du seuil.
- Un admin peut ajouter ses **propres règles de seuil** dans l'onglet Instruments (instrument, « inférieur / supérieur à », seuil et marge dans l'unité affichée, gravité Avertissement ou Critique). 20 règles par bateau ; une règle peut être désactivée sans être supprimée.
- Les alertes sont évaluées **sur le serveur** à chaque lot reçu et **à bord**, dans l'application, à chaque valeur du flux : l'alerte s'affiche tout de suite, même sans réseau, avec la mention « Détectée à bord ».

## Notifications

- Nouveaux types `instrument.alert_opened` (notification in-app **et push**) et `instrument.alert_cleared` (in-app), famille « Flotte » des préférences, envoyés à toute l'équipe (hors propriétaires). Lien : `/boats/:id?tab=instruments`.
- Pastille du nombre d'alertes ouvertes sur l'onglet Instruments ; ligne « Instrument » dans « À traiter » du tableau de bord.

## Technique

- Tables `boat_instrument_alert_rules` et `boat_instrument_alerts` (migration `1891000000000`) ; une seule alerte ouverte par règle et par chemin (index unique partiel).
- Routes : `POST /boats/:boatId/instrument-alert-rules`, `PUT` et `DELETE …/:ruleId` (admin, plans Pro et Entreprise, redirections Inertia). La prop différée `instruments` expose `rules` et `openAlerts`.
- Évaluation commune serveur/client : `shared/helpers/instrument_alerts.ts` (`evaluateAlerts`). Services : `InstrumentAlertService` (listener `OnTelemetryIngested`), `InstrumentAlertRuleService`.
- Audit : `boat.instrument_alert_rule_update` / `boat.instrument_alert_rule_delete`.
- Base de connaissance du copilote : mots-clés « alertes instruments », « seuil », « batterie faible », « petit fond » ajoutés à l'entrée `instruments-signalk`.
