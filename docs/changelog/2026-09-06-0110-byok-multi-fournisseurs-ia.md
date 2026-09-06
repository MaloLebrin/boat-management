# Clés API IA multi-fournisseurs (Mistral, Claude, ChatGPT, Gemini) — BYOK par organisation

**Date** : 6 septembre 2026

## Contexte

Le BYOK introduit avec le copilote FleetAi était mono-fournisseur : une organisation ne pouvait enregistrer qu'une clé API **Mistral** (colonne `organizations.ai_api_key_encrypted`). Une organisation peut désormais enregistrer une clé API pour chacun des quatre fournisseurs supportés — **Mistral**, **Claude** (Anthropic), **ChatGPT** (OpenAI) et **Gemini** (Google) — puis choisir le **fournisseur actif** que le copilote utilise. Le périmètre reste inchangé : **seul l'assistant FleetAi** consomme la clé BYOK ; les autres fonctionnalités IA (diagnostic moteur, recherche de pièces, suggestions) restent sur la clé Mistral de l'app.

## Base de données

- Nouvelle table **`organization_ai_keys`** : `organization_id` (FK cascade), `provider` (`mistral` | `anthropic` | `openai` | `google`), `api_key_encrypted` (chiffrée via APP_KEY), contrainte **unique (organization_id, provider)** — un nouvel enregistrement remplace la clé existante.
- Nouvelle colonne **`organizations.ai_provider`** (nullable) : fournisseur actif. `null` = clé Mistral de l'app, le quota mensuel de tokens s'applique.
- **Migration de données** : les clés `ai_api_key_encrypted` existantes deviennent des lignes `provider='mistral'` et ces organisations sont basculées sur `ai_provider='mistral'` (comportement identique à avant). La colonne `ai_api_key_encrypted` est ensuite supprimée ; le `down()` la restaure et y recopie la clé Mistral.

## Backend

- `AiService.chat(messages, options)` : nouvelle signature à objet d'options (`AiChatOptions` dans `shared/types/ai.ts` — `provider`, `model`, `apiKey`) avec un **adaptateur par fournisseur** (SDK officiels : `@mistralai/mistralai`, `@anthropic-ai/sdk`, `openai`, `@google/genai`), même contrat de sortie `{ content, tokensUsed }`.
- **Résolution centralisée du modèle** : un `aiModelOverride` étranger au fournisseur de l'appel est ignoré (fallback sur le défaut du fournisseur — `DEFAULT_AI_MODEL_BY_PROVIDER`). Les features non-assistant, qui appellent toujours Mistral, ne peuvent donc pas recevoir un identifiant de modèle Claude/GPT/Gemini.
- Nouveau service `OrganizationAiKeyService` : `listConfigured` (booléens par fournisseur — seule forme qui sort du backend), `setKey` (upsert chiffré), `removeKey` (supprimer la clé du fournisseur actif ramène l'org au défaut app), `setActiveProvider` (refuse un fournisseur sans clé — `AiProviderKeyMissingError`, 422 ; reset d'un `aiModelOverride` étranger), `resolveActiveKey` (déchiffrement au moment de l'appel uniquement).
- `AssistantChatService` : le quota de tokens ne s'applique que sans fournisseur actif ; un échec avec la clé de l'org lève toujours `AssistantCustomKeyFailedError`.
- Validation : `aiModelOverride` accepte l'union des modèles de tous les fournisseurs (`ALL_AI_MODELS`), l'appartenance au fournisseur actif est vérifiée dans le contrôleur (clé i18n `validator.settings.aiModelWrongProvider`).

## Routes

- `PUT /settings/ai/provider` (`settings.ai.provider.update`) — sélection du fournisseur actif (`aiProvider` nullable).
- `PUT /settings/ai/api-key/:provider` et `DELETE /settings/ai/api-key/:provider` — enregistrement/suppression de la clé d'un fournisseur. Matcher de route sur `:provider` : un fournisseur inconnu → 404.
- Les anciennes routes sans `:provider` n'existent plus.

## Frontend

- `/settings/ai` : quatre cartes de clé (une par fournisseur, `AiProviderKeyCard`), carte de sélection du fournisseur actif (`AiActiveProviderCard` — seuls les fournisseurs avec clé sont sélectionnables), carte de personnalisation enterprise extraite dans `AiCustomizationCard` (le choix de modèle suit le fournisseur actif).
- Props de la page : `aiProvider` + `configuredProviders` (booléens) — les clés ne transitent jamais vers le frontend.
- i18n : libellés génériques avec interpolation `{provider}` (`settings.ai.apiKey.*`), nouveau bloc `settings.ai.activeProvider.*`, 8 nouveaux modèles dans `settings.ai.models.*` (clés **sanitizées** sans point, ex. `gpt-5-1` — un point casserait la résolution par chemin ; helper `aiModelI18nKey`).

## Comportements notables

- BYOK (tout fournisseur) **bypasse le quota mensuel de tokens** ; l'usage reste émargé dans `ai_token_usages` pour les statistiques.
- Une clé enregistrée mais **non sélectionnée** comme fournisseur actif ne bypasse rien.
- Supprimer la clé du fournisseur actif ramène l'organisation au défaut de l'app (`ai_provider = null`).
- Les clés sont write-only : stockées chiffrées, jamais réaffichées, jamais sérialisées (`serializeAs: null`).
