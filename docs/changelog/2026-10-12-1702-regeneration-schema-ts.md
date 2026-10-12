# 2026-10-12 — Régénération de `database/schema.ts`

`database/schema.ts` est généré par `node ace migration:run`, mais la copie committée sur `main` n'avait pas été régénérée après les migrations 1884 à 1886. Les modèles Lucid étendent ces classes : les colonnes manquantes n'avaient donc pas d'attribut typé.

- **Cause.** Les migrations ont été mergées sans committer le `schema.ts` régénéré.
- **Correctif.** Régénération contre une base vierge (base temporaire dans le service `postgres_test`, toutes les migrations jouées), puis `prettier --write`. Ajouts :
  - nouvelles classes `InventoryItemSchema`, `InventoryMovementSchema`, `SupplierSchema`, `PurchaseOrderSchema`, `PurchaseOrderLineSchema` (migration 1885, inventaire) ;
  - nouvelles classes `MarinaStaySchema`, `MooringContractSchema` et colonnes `kind`, `status`, `lengthM`, `beamM`, `draftM`, `dailyRate`, `monthlyRate`, `annualRate`, `notes` sur `SpotSchema` (migration 1884, opérations de marina) ;
  - `BoatEnginePartSchema.inventoryItemId` (1885) et `OrganizationSchema.currency` (1886) ;
  - `MediaSchema` : réordonnancement alphabétique de `organizationId` / `originalFilename`, sans changement de type.
- **Aucun changement de base de données** : fichier généré uniquement, aucune migration ni modèle modifié.
- **Vérifications.** `pnpm typecheck` et `node ace build` passent.
