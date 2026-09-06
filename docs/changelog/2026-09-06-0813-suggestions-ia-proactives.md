# Suggestions IA proactives — bateaux, moteurs, pièces et équipements

**Date** : 6 septembre 2026

## Contexte

Les analyses IA (`ai_analyses`) étaient exclusivement manuelles : un bouton par panneau (flotte, bateau, diagnostic moteur). Les organisations disposant de l'IA (plans `pro`/`enterprise`, flag `canUseAI`) bénéficient désormais d'analyses **qui se déclenchent automatiquement** sur les bateaux, moteurs, pièces et équipements, avec notification quand de nouvelles suggestions sont prêtes. Le panneau IA de la page moteur — jusqu'ici une maquette statique — est branché sur une vraie analyse.

## Nouvelle analyse moteur (`kind: 'engine_suggestions'`)

- Nouveau kind dans `ai_analyses`, scopé `boat_engine_id`, même contrat de sortie que les suggestions bateau (`AiSuggestion[] = [{ text }]`).
- Contexte : identité et heures du moteur (dont heures depuis l'installation via `install_hours`), pièces (usure, stock vs seuil d'alerte, date d'achat), tâches ouvertes (`due_at` / `due_engine_hours`), 5 derniers événements, intervalles du **catalogue d'opérations standard** (#581) de la famille du moteur (labels localisés).
- Route : `POST /ai/boats/:boatId/engines/:engineId/suggestions` (`ai.engineSuggestions`, auth + `aiThrottle`), redirection Inertia vers la page moteur.
- Page moteur : prop différée `aiSuggestions` (jamais `null`, `[]` à défaut — #478) + nouveau composant `EngineAiSuggestionsPanel` (miroir de `BoatOverviewAiPanel` : refresh manuel, skeletons, gate `canUseAI` + `UpgradePlanModal`). Les clés factices `boats.engineShow.overview.aiPrompt1/2` sont remplacées par `aiEmpty`/`aiRefresh`/`aiRefreshing` (EN + FR).

## Suggestions bateau enrichies

`BoatSuggestionsInput` (kind `boat_suggestions` inchangé) porte désormais :

- par moteur : `family`, `installHours`, pièces à remplacer (`wearState` ∈ worn/to_replace/damaged), pièces en stock bas (`stock <= min_stock_alert`) ;
- les équipements divers (`boat_generic_equipment` : catégorie, marque, statut, date d'achat) ;
- l'expiration **effective** des équipements de sécurité (date saisie ou durée de vie Division 240 via `resolveEffectiveExpiry`, #582).

Le contexte est construit par le nouveau `AiSuggestionContextService`, partagé entre le contrôleur (refresh manuel) et le job planifié — les deux chemins produisent le même input, donc la même empreinte.

## Déclenchement planifié

- Nouveau job `GenerateAiSuggestions` (queue `ai`, `maxRetries: 1`) planifié **tous les jours à 05:00 Europe/Paris** (`daily-generate-ai-suggestions`), avant le scan de notifications de 07:00.
- `AiProactiveSuggestionService.run()` parcourt les organisations séquentiellement : skip si `!canUseAI`, quota mensuel de tokens épuisé, ou org démo. Par bateau puis par moteur, et par **locale distincte des membres**, il régénère une analyse seulement si :
  - la dernière analyse du scope a plus de **7 jours** (`MIN_AGE_DAYS`), et
  - le contexte a changé — comparaison de `context_hash` (sha256 de l'input, stocké sur `ai_analyses`).
- Garde-fous : plafond de 200 générations par run, `QuotaExceededError` avalée (l'org est abandonnée sans faire échouer le run), une erreur sur un bateau n'interrompt pas les autres.
- Les lignes planifiées portent `user_id NULL` (colonne rendue nullable) : elles appartiennent à l'organisation et sont visibles de tous ses membres (`getLatest*` matche `user_id = X OR user_id IS NULL`).

## Notifications

- Nouveau type `ai.suggestions_ready` (severity `info`) : une notification agrégée **par bateau régénéré**, envoyée aux admins de l'org dans la locale de chacun, `actionUrl` vers la page du bateau.
- Anti-spam : `createIfNotRecent` sur `metadataKey: 'boatId'`, fenêtre de **6 jours**. Pas de web push (type non pushable).
- i18n : `notifications.messages.ai.suggestions_ready.{title,body}` + `notifications.types["ai.suggestions_ready"]` (EN + FR).

## Base de données

- Migration `1847000000000` : contrainte `ai_analyses_kind_check` étendue à `engine_suggestions` (rollback non permissif).
- Migration `1847000001000` : colonne `context_hash` (varchar 64, nullable) + `user_id` nullable sur `ai_analyses` (rollback non permissif si lignes NULL).

## Backend

- `app/services/ai_suggestion_context_service.ts` — contextes bateau/moteur (source unique contrôleur + cron).
- `app/services/engine_suggestions_prompt_service.ts` — builder pur FR/EN du message moteur (réutilise `buildSystemPrompt`).
- `app/services/ai_proactive_suggestion_service.ts` — run planifié (cadence, hash, quotas, notifications).
- `app/services/ai_analysis_service.ts` — `generateEngineSuggestions`, `getLatestEngineSuggestions`, `getLatestForScope`, `context_hash` persisté, `userId` nullable.
- `app/utils/context_hash.ts` — `computeContextHash` (sha256).
- `AiController.boatSuggestions` refactoré sur le service de contexte (mapping inline supprimé) ; nouvelle action `engineSuggestions`.

## Tests

- Unit : `engine_suggestions_prompt_service.spec.ts` (4), `context_hash.spec.ts` (3), sections enrichies dans `ai_prompt_service.spec.ts` (+3).
- Intégration : `ai_proactive_suggestion_service.spec.ts` (7) — lignes org `user_id NULL` par locale, cadence, skip par hash, régénération sur changement de donnée + notification dédupliquée, org starter intouchée, org à quota épuisé skippée.
- Fonctionnel : `engine_suggestions.spec.ts` (7) — 401, gate plan, bateau/moteur introuvables, happy path (`kind`, `context_hash`, redirection), prop différée `[]` / ligne planifiée visible.
- Vitest : `engine_ai_suggestions_panel.spec.ts` (4) — états vide/rempli, POST de refresh, modale d'upgrade en starter.
