# 2026-06-29 — [F-01] endedAt peut être antérieur à startedAt sur une escale portuaire

**Bug corrigé**

- `app/validators/boat_port_stay_validator.ts` : ajout de `.afterOrSameAs('startedAt')` sur le champ `endedAt` — validation cross-field empêche la persistance d'escales aux dates inversées
- `resources/lang/fr/validator.json` + `en/validator.json` : ajout de la clé `date.afterOrSameAs` pour le message d'erreur traduit
- Tests : 3 tests fonctionnels couvrant `endedAt < startedAt` (POST et PATCH rejetés) et `endedAt = startedAt` (même jour accepté)
