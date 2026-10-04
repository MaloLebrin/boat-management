# 2026-10-03 — Pièces moteur : la modification n'efface plus le seuil d'alerte (#947)

Modifier une pièce depuis la fiche moteur (onglet Pièces → « Modifier ») remettait silencieusement
son seuil d'alerte de stock (`boat_engine_parts.min_stock_alert`) à `null`. Une pièce dont le seuil
venait des seeders, d'un import CSV, de l'assistant ou de l'API le perdait au premier passage par
l'UI. Le widget « Pièces manquantes » et le contexte IA cessaient alors de la signaler en stock bas.

- **Cause** : `EnginePartModal.vue` ne postait aucun champ `minStockAlert`, et
  `BoatEnginePartService.update()` écrivait `payload.minStockAlert ?? null`, donc l'absence du
  champ effaçait la valeur.
- **Correctif service** : `update()` ne touche au seuil que si le champ est présent
  (`undefined` = inchangé, `null` = effacé), comme `inventoryItemId` depuis #892.
- **Validateur** (`app/validators/boat_engine_part.ts`) : `minStockAlert` est maintenant
  `nullable()`. Sans cela, VineJS traite le `null` produit par le body parser (champ vidé,
  `convertEmptyStringsToNull`) comme un champ absent, et vider le champ ne l'effacerait pas.
  Une valeur non entière ou négative est désormais **refusée** (erreur de validation) au lieu
  d'être convertie en `null` sans prévenir.
- **Formulaire** : nouveau champ « Seuil d'alerte » (`name="minStockAlert"`, entier ≥ 0, avec une
  aide), prérempli en édition. `BoatEquipmentController.showEngine` expose `minStockAlert` dans
  `engine.parts`, et le type `BoatShowEnginePart` le porte.
- **i18n** : `boats.engineShow.parts.minStockAlert` et `minStockAlertHint` (FR/EN).
- **Docs** : `docs/domain/spare-parts.md` (règle absent/vide) et `docs/frontend/ui-map.md`.
- **Copilote** : l'entrée « Inventaire des moteurs » (`engines-inventory`) décrit le seuil d'alerte (mots-clés `seuil`, `alerte`, `threshold`).
- **Tests** :
  - `tests/functional/boats/engine_part_min_stock_alert.spec.ts` : seuil préservé quand le champ
    est absent, modifié puis effacé, valeur négative refusée, création, prop de la fiche moteur ;
  - `tests/inertia/engine_part_modal.spec.ts` : préremplissage, champ vide sans seuil, remise à
    zéro à l'ajout.
