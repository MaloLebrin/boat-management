# 2026-07-01 — [#166] Sécurité : ai_analyses scopées par organisation pour éviter la fuite de données inter-org

**Fuite de données inter-organisation corrigée**

- Migration `1806000000000_alter_ai_analyses_add_organization_id.ts` : ajoute `organization_id` (FK → organizations) + index `(organization_id, kind)` à la table `ai_analyses`.
- `database/schema.ts` : `AiAnalysisSchema` enrichi du champ `organizationId`.
- `app/models/ai_analysis.ts` : relation `belongsTo(Organization)` ajoutée.
- `app/services/ai_analysis_service.ts` :
  - `getLatestFleetAnalysis(userId, orgId)` — filtre désormais aussi par `organizationId`.
  - `getLatestBoatSuggestions(userId, boatId, orgId)` — idem.
  - `generateFleetAnalysis()` et `generateBoatSuggestions()` — stockent `organizationId` à la création.
- `app/controllers/home_controller.ts` : passe `user.organizationId` à `getLatestFleetAnalysis` ; retourne `null` si l'utilisateur n'a pas d'org.
- `app/controllers/boats_controller.ts` : passe `user.organization.id` à `getLatestBoatSuggestions`.
- `database/factories/ai_analysis_factory.ts` : nouvelle factory de test.
- 5 tests d'intégration ajoutés dans `tests/integration/services/ai_analysis_service.spec.ts`.
