# Instruments : quatre nouvelles règles d'alerte intégrées (#1005)

Date : 2026-10-25

## Ce qui change

Quatre règles s'ajoutent aux règles intégrées des instruments Signal K, toujours actives sur les bateaux équipés (Pro et Entreprise), avec hystérésis :

- **Carburant bas** : niveau de réservoir carburant < 15 % (levée à 20 %), avertissement.
- **Tension batterie basse** : < 11,8 V (levée à 12,1 V), avertissement.
- **Pression d'huile basse** : < 1 bar (levée à 1,3 bar), critique.
- **Régime moteur trop haut** : > 3 500 tr/min (levé à 3 300), avertissement.

## Technique

- `BUILTIN_ALERT_RULES` (`shared/constants/instrument_alerts.ts`) : seuils en SI (régime en hertz). Évaluation inchangée (`evaluateAlerts`), serveur et client.
- Libellés `instruments.alerts.builtin.*` en FR/EN ; documentation dans `docs/domain/instruments.md`.
- Hors périmètre : perte de signal (règle temporelle) ; cartes de la page marketing, après livraison.
