# 2026-07-03 — [#199] Pièces moteur : stock non renseigné n'est plus traité comme épuisé

**Corrige B-08 : `listLowStock()` incluait `stock IS NULL OR stock <= min_stock_alert`, déclenchant une fausse alerte low-stock dès qu'une pièce avait un `minStockAlert` défini mais un `stock` non renseigné (tracking désactivé)**

- `app/services/boat_engine_part_service.ts` : `listLowStock()` retire la branche `stock IS NULL` — les comparaisons SQL `<=` excluent déjà nativement les valeurs NULL
- Test ajouté : `tests/integration/services/boat_engine_part_service.spec.ts` (`listLowStock ignores parts with untracked (null) stock`)
