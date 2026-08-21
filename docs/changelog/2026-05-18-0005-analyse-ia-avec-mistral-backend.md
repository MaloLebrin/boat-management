# 2026-05-18

## Analyse IA avec Mistral — Backend

Intégration complète des suggestions IA via Mistral pour l'analyse de flotte et de bateaux individuels :

- **Migration** : nouvelle table `ai_analyses` (id, user_id, boat_id, kind, response_text, created_at)
- **Model** : `AiAnalysis` avec relations `User` et `Boat`
- **Service** : `AiAnalysisService` avec méthodes :
  - `getLatestFleetAnalysis(userId)` : récupère la dernière analyse de flotte
  - `getLatestBoatSuggestions(userId, boatId)` : récupère les dernières suggestions pour un bateau
  - `generateFleetAnalysis(userId, input)` : génère des suggestions IA pour la flotte entière
  - `generateBoatSuggestions(userId, boatId, input)` : génère des suggestions IA pour un bateau spécifique
- **Types exportés** : `AiSuggestion`, `FleetAnalysisInput`, `BoatSuggestionsInput`
- **Routes** :
  - `POST /ai/fleet-analysis` → `ai.fleetAnalysis` (déclenche l'analyse de flotte)
  - `POST /ai/boats/:id/suggestions` → `ai.boatSuggestions` (déclenche les suggestions bateau)
- **Props Inertia** :
  - Dashboard : `aiFleetAnalysis` (tableau de suggestions ou null)
  - Page boat/show : `aiSuggestions` (tableau de suggestions ou null)
- **i18n** : clé `flash.ai.analysisError` ajoutée (EN/FR)
- **Appel synchrone** : pas de queue, résultat stocké en base et servi en cache

---
