# 2026-07-01 — [#188] Escales portuaires : autoriser cost = 0 (mouillages gratuits)

**Correction du validateur qui rejetait les escales gratuites (cost = 0)**

- `app/validators/boat_port_stay_validator.ts` : remplacement de `.positive()` par `.min(0)` sur `cost` — cohérent avec `boat_document.ts` qui utilise déjà `.min(0)`.
- Permet d'enregistrer les mouillages gratuits, ports partenaires et invitations sans coût.
