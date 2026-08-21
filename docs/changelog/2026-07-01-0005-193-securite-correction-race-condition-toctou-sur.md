# 2026-07-01 — [#193] Sécurité : correction race condition TOCTOU sur suppression pontoon/mouillage

**Race condition (TOCTOU) corrigée dans la suppression des pontoons et mouillages**

- `app/services/pontoon_service.ts` : `deleteForPort` enveloppe désormais le count de bateaux et le `delete()` dans `db.transaction()` avec `.useTransaction(trx)` sur toutes les requêtes, garantissant qu'aucun bateau ne peut être affecté à un spot entre la vérification et la suppression.
- `app/services/mouillage_service.ts` : même correction appliquée à `MouillageService.deleteForPort`.
- `tests/integration/services/pontoon_service.spec.ts` : 3 nouveaux tests — suppression sans spots, suppression avec spots libres, et `PontoonHasBoatsError` quand un bateau occupe un spot.
- `tests/integration/services/mouillage_service.spec.ts` : 3 nouveaux tests symétriques pour `MouillageService`.
