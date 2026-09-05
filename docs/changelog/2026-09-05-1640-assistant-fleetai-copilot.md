# Copilote FleetAi dans l'app (panneau global) + clé API Mistral par organisation (BYOK)

**Date** : 5 septembre 2026

## Contexte

La page marketing promettait un copilote IA intégré (mock `HomeMockFleetide`) : question en langage naturel sur la flotte, réponse contextuelle, création de tâche en un clic. Cette feature n'existait pas dans l'app. Elle est désormais implémentée sous la forme d'un panneau de chat global, avec en complément une maîtrise renforcée des coûts de tokens et la possibilité pour une organisation d'utiliser sa propre clé API Mistral.

## Panneau global

- Entrée « FleetAi » épinglée en bas de la sidebar desktop (`AsideMenu`) et du drawer mobile (`MobileSidebarDrawer`), accent violet comme le mock marketing. Masquée pour le rôle `boat_owner`.
- Panneau latéral droit sur desktop (3e colonne du layout `default.vue`), drawer plein écran sur mobile (même composant, styles responsive). Échap ferme le panneau, l'état ouvert/fermé persiste en `localStorage`.
- Composants dans `inertia/components/assistant/` : `AssistantPanel`, `AssistantThread`, `AssistantMessage`, `AssistantActionCard`, `AssistantComposer`, `AssistantUpsell`, `AssistantEntryButton` ; état partagé dans `inertia/composables/use_assistant_panel.ts`.
- La conversation vit dans la prop partagée **optional** `assistantConversation` (`InertiaMiddleware`) : évaluée uniquement quand le panneau la demande via un partial reload (`only: ['assistantConversation']`) — zéro coût sur les chargements de page normaux.
- Plan starter : le panneau affiche un upsell + `UpgradePlanModal feature="ai"` (aucun appel IA possible).

## Capacités de l'agent

Le modèle répond à chaque tour par un objet JSON discriminé (`AssistantAiReply`, `shared/types/assistant.ts`), parsé et validé **avant toute écriture** :

- **`answer`** : réponse contextuelle appuyée sur le contexte injecté à chaque tour — roster de la flotte (bateaux + moteurs avec leurs ids) et digest du planning (tâches en retard / bientôt dues).
- **`propose_task`** : proposition de tâche de maintenance. Validée contre le roster (bateau et moteur de l'org, règles miroir de `BoatMaintenanceTaskService`), puis stockée dans `pending_action`. **Jamais écrite directement** : l'utilisateur confirme ou refuse via une carte dédiée. L'endpoint de confirmation n'accepte aucun payload client — il exécute uniquement la proposition stockée, derrière `MaintenancePolicy.create`, avec journal d'audit (`maintenance_task.create`).
- **`handoff`** : orientation vers le diagnostic de panne (`/boats/:boatId/engines/:engineId/diagnostic`) ou la recherche de pièces (`.../spare-parts/chat`), avec bateau/moteur résolus conversationnellement et revalidés côté serveur.

Un id inventé par le modèle (bateau ou moteur hors roster) lève `AiInvalidResponseError` : rien n'est persisté.

## Routes

Groupe `middleware.auth()` (`start/routes/assistant.ts`) :

- `POST /assistant/conversations` (`assistant.start`, `aiThrottle`) — démarre une conversation (archive la précédente).
- `POST /assistant/conversations/:token/messages` (`assistant.message`, `aiThrottle`).
- `POST /assistant/conversations/:token/action/confirm` (`assistant.action.confirm`) — crée la tâche proposée.
- `POST /assistant/conversations/:token/action/dismiss` (`assistant.action.dismiss`).
- `POST /assistant/conversations/:token/archive` (`assistant.archive`) — « nouvelle conversation ».

Toutes répondent par redirection Inertia (flash + `redirect().back()`), jamais de JSON.

## Base de données

- Table `ai_assistant_conversations` (migration `1846000000000`) : `token`, `user_id`/`organization_id` (SET NULL), `locale`, `status` (`active`/`archived`), `messages` jsonb (fil complet), `pending_action` jsonb (proposition validée en attente), `tokens_used`. Une seule conversation active par utilisateur.
- Colonne `organizations.ai_api_key_encrypted` (migration `1846000001000`) : clé API Mistral chiffrée (BYOK).

## Maîtrise des coûts de tokens

Constantes dans `shared/types/assistant.ts` :

- Fenêtre d'historique glissante : seuls les **12 derniers messages** sont rejoués au modèle (le fil complet reste stocké et affiché).
- Contexte borné : roster ≤ 40 bateaux, digest ≤ 5 tâches en retard + 5 bientôt dues, lignes tronquées à 120 caractères.
- Plafond de **100 000 tokens par conversation** — au-delà, invitation à démarrer une nouvelle conversation.
- Limites conservées : 20 messages utilisateur max, 4 000 caractères/message, `aiThrottle` 20 req/min, quota mensuel d'org (`aiTokensPerMonth`).

## BYOK — clé API Mistral par organisation

- Page `settings/ai` désormais accessible dès `canUseAI` (pro + enterprise) ; la personnalisation prompt/modèle reste réservée à `canCustomizeAI` (enterprise). Nouvelles routes : `PUT /settings/ai/api-key`, `DELETE /settings/ai/api-key` (`OrganizationPolicy.configureAI`).
- La clé est chiffrée au repos via `@adonisjs/core/encryption` (`APP_KEY`) — une rotation d'`APP_KEY` invalide les clés stockées. Elle n'est **jamais renvoyée au frontend** : seul le booléen `hasCustomApiKey` sort du backend (`serializeAs: null` sur le modèle).
- Quand la clé est présente, les appels du copilote consomment sur le compte Mistral de l'org : le quota de tokens de l'app est **sauté** (`assertCanUseTokens`), l'usage reste enregistré pour les statistiques (`recordUsage`). Un échec d'appel avec la clé d'org affiche un flash dédié invitant à vérifier la clé.
- Limité au copilote en V1 — les autres features IA (analyse flotte, diagnostic, pièces) restent sur la clé de l'app (extension prévue en PR séparée).

## Backend

- `app/services/assistant_chat_service.ts` — cycle canonique (verrou d'org → quota → appel → validation → persistance → émargement), calqué sur `SparePartChatService`.
- `app/services/assistant_context_service.ts` — roster + digest, reconstruits à chaque tour (jamais stockés).
- `app/services/assistant_prompt_service.ts` — prompts FR (vouvoiement) / EN + parse strict de la réponse.
- `app/services/ai_service.ts` — 3e paramètre optionnel `apiKeyOverride` sur `chat()`.
- `app/controllers/assistant_controller.ts`, `app/validators/assistant.ts`, `app/transformers/assistant_transformer.ts`, `app/exceptions/assistant_errors.ts`, `app/models/ai_assistant_conversation.ts`.

## i18n

- Nouveau namespace `assistant` (`resources/lang/{en,fr}/assistant.json`) — FR en vouvoiement.
- `flash.json` : section `flash.assistant.*` + `flash.settings.{aiApiKeyUpdated,aiApiKeyRemoved,aiSettingsRequirePlan}`.
- `settings.json` : `settings.ai.apiKey.*`.

## Tests

- `tests/functional/assistant/assistant_chat.spec.ts` (17 tests) : contexte injecté, gating plan/quotas, validations anti-hallucination, fenêtre d'historique, budget de conversation, multi-tenancy, BYOK.
- `tests/functional/assistant/assistant_actions.spec.ts` (7 tests) : confirmation (tâche + audit + carte), refus, idempotence, permissions.
- `tests/functional/settings/ai_api_key.spec.ts` (6 tests) : chiffrement, non-exposition, gating plan/rôle, suppression.
- `tests/inertia/assistant_{action_card,composer,message}.spec.ts` (14 tests) : rendu des cartes, routes de confirmation, états du composer.
