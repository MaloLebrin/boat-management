# Suggestions IA — analyses `ai_analyses`, déclenchement proactif

## Les kinds de `ai_analyses`

| `kind`               | Scope                         | Contenu (`response_text`) | Généré par                            |
| -------------------- | ----------------------------- | ------------------------- | ------------------------------------- |
| `fleet_analysis`     | organisation (`boat_id NULL`) | `AiSuggestion[]`          | bouton dashboard                      |
| `boat_suggestions`   | `boat_id`                     | `AiSuggestion[]`          | bouton page bateau **+ job planifié** |
| `engine_suggestions` | `boat_engine_id`              | `AiSuggestion[]`          | bouton page moteur **+ job planifié** |
| `engine_diagnosis`   | `boat_engine_id`              | `EngineDiagnosisResult`   | page diagnostic (#516)                |

Chaque ligne est estampillée `locale` (#460 — un texte généré ne se traduit pas après coup) et, pour les kinds « suggestions », `context_hash`.

## `user_id` nullable : lignes personnelles vs lignes d'organisation

- Un refresh **manuel** crée une ligne `user_id = <déclencheur>`.
- Le **job planifié** crée des lignes `user_id NULL` : elles appartiennent à l'organisation.
- Les lectures (`getLatestBoatSuggestions`, `getLatestEngineSuggestions`) matchent `user_id = X OR user_id IS NULL` : tout membre voit les analyses planifiées.
- `getLatestForScope(kind, orgId, scope, locale)` ignore `user_id` : c'est la vue du job pour la cadence — un refresh manuel récent compte autant qu'une génération planifiée et repousse la prochaine régénération.

## Contexte et `context_hash`

`AiSuggestionContextService` est la **source unique** des inputs (`buildBoatInput`, `buildEngineInput`) pour le contrôleur ET le job : les deux chemins produisent le même objet, donc la même empreinte `computeContextHash` (sha256 du `JSON.stringify`, `app/utils/context_hash.ts`), persistée par `AiAnalysisService.generate*`.

Signaux injectés :

- **Bateau** : identité, moteurs (famille, heures, `installHours`, pièces à remplacer, stock bas), voiles, gréement, équipements de sécurité avec expiration effective Division 240 (`resolveEffectiveExpiry`, #582), équipements divers, tâches et 5 derniers événements.
- **Moteur** : identité/heures, pièces (usure, stock vs seuil, achat), tâches et événements du moteur, intervalles du catalogue d'opérations standard (#581) de sa famille de maintenance (`resolveEngineFamily(kind, fuel)` — distincte du vocabulaire catalogue `engine.family`).

Les prompt builders (`ai_prompt_service.ts`, `engine_suggestions_prompt_service.ts`) restent purs : les labels du catalogue arrivent déjà localisés dans l'input.

## Job planifié `GenerateAiSuggestions`

- Cron `0 5 * * *` Europe/Paris (`start/scheduler.ts`), queue `ai`, `maxRetries: 1` (un retry re-brûlerait des tokens ; la résilience est par entité).
- `AiProactiveSuggestionService.run()`, séquentiel par organisation :
  1. skip org démo (`DEMO_ORG_SLUG`), `!canUseAI`, quota mensuel de tokens épuisé ;
  2. une génération par (bateau|moteur) × **locale distincte des membres** ;
  3. skip si dernière analyse < `MIN_AGE_DAYS` (7 j) ou `context_hash` inchangé ;
  4. `QuotaExceededError` en cours de route → org abandonnée, run poursuivi ; toute autre erreur → log + bateau suivant ;
  5. plafond `MAX_GENERATIONS_PER_RUN` (200) par run.
- Notifications : une `ai.suggestions_ready` par bateau régénéré × admin, locale de l'admin, `createIfNotRecent` (`metadataKey: 'boatId'`, 6 jours) — cf. `docs/domain/notifications.md`.

## Affichage

- Page bateau : prop différée `aiSuggestions` (groupe `maintenance`), panneau `BoatOverviewAiPanel`.
- Page moteur : prop différée `aiSuggestions`, panneau `EngineAiSuggestionsPanel` (rail droit de l'onglet Aperçu). Un callback différé ne doit **jamais** résoudre `null` (#478) : l'absence d'analyse est `[]`.

## Clé API

Les suggestions utilisent la clé Mistral de l'app — le BYOK par organisation reste limité au copilote (cf. changelog du 2026-09-05).
