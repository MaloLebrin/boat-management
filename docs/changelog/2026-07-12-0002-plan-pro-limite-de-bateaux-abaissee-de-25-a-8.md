# 2026-07-12 — Plan Pro : limite de bateaux abaissée de 25 à 8

Ajustement tarifaire : le plan **Pro** plafonne désormais à **8 bateaux** (contre 25). L'écart avec Starter (2) était trop large et Pro captait sans surcoût des flottes relevant d'Enterprise ; 8 recentre Pro sur les petites flottes et clarifie le passage à Enterprise.

- **`shared/types/plan.ts`** : `PLAN_LIMITS.pro.maxBoats` passe de `25` à `8` (source unique du quota, appliquée par `QuotaService.assertCanAddBoat`). Aucun autre quota Pro modifié (membres, stockage, IA inchangés).
- **Vitrine** (`resources/lang/{fr,en}/marketing.json`) : sous-titre et feature du plan Pro, meta-description, tableau comparatif, sous-titre Enterprise (« au-delà de 8 bateaux ») et FAQ mis à jour.
- **Docs** : `docs/quotas.md`, `docs/billing-and-quotas.md` et `docs/offre-modulaire.md` alignés sur la nouvelle valeur.
