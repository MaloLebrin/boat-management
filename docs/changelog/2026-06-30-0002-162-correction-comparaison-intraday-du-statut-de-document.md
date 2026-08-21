# 2026-06-30 — [#162] Correction comparaison intraday du statut de document bateau

**Bug corrigé**

- `app/services/boat_document_service.ts` — `computeStatus()` : comparaison désormais en jours entiers via `startOf('day')` des deux côtés. Avant le correctif, un document dont `expiresAt` était à minuit du jour J était immédiatement marqué `expired` à 00:00:01, car `DateTime.now()` (avec l'heure courante) produisait un diff négatif. Le document reste maintenant `expiring_soon` toute la journée J et passe à `expired` uniquement le lendemain.
