# Fix : fixture locale explicite dans le test d'intégration AiAnalysisService

**Date** : 2026-08-25

## Contexte

Le test « getLatestBoatSuggestions returns result for correct org »
(`tests/integration/services/ai_analysis_service.spec.ts`) échouait de façon
reproductible en local alors que le service est correct.

## Diagnostic

- Les deux cas `boat_suggestions` du groupe « organization scoping » créent
  l'analyse via `AiAnalysis.create()` **sans champ `locale`**, en s'appuyant sur
  le défaut DB `'fr'` introduit par la migration
  `1825000000000_add_locale_to_ai_analyses_table` (#460/#512).
- Sur la base de test locale (`3d-website_test`), cette migration avait été
  exécutée dans une **version intermédiaire** (colonne `locale` nullable, sans
  défaut, sans index composite) pendant le développement de #512 ; la version
  finale du fichier n'a jamais été rejouée (`adonis_schema` la marquait déjà
  faite). Les lignes insérées avaient donc `locale = NULL` et le filtre
  `.where('locale', 'fr')` du service ne les trouvait pas.

## Corrections

- **Test** : les deux `AiAnalysis.create()` du groupe « organization scoping »
  passent désormais `locale: 'fr'` explicitement — la fixture ne dépend plus
  d'un défaut DB (et respecte le type non-nullable du schéma).
- **Base de test locale** (réparation hors code, documentée ici) : alignement
  manuel de `3d-website_test` sur la migration finale — `locale` `NOT NULL
DEFAULT 'fr'` + index `ai_analyses_organization_id_kind_locale_index`. La
  base de dev était déjà correcte ; aucune migration n'est modifiée.

## Résultat

`node ace test integration --files "tests/integration/services/ai_analysis_service.spec.ts"`
→ 12 passed.
