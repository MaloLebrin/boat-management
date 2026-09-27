# 2026-09-27 — Délai maximal sur les appels aux fournisseurs IA (#853)

Les quatre clients IA (Mistral, OpenAI, Anthropic, Gemini) étaient instanciés sans timeout. Avec les défauts des SDK (aucune limite pour Mistral, 10 minutes avec 2 relances pour OpenAI et Anthropic), un fournisseur lent occupait une requête du serveur `web` pendant tout ce temps. Les chats publics (diagnostic, recherche de pièces), accessibles sans compte, étaient les plus exposés.

## Correctif

`AiService.chat` borne chaque appel, relances comprises :

- **tour de chat** (assistant, diagnostic public, recherche de pièces, chat pièces détachées) : `AI_CHAT_TIMEOUT_MS`, 30 s, valeur par défaut ;
- **analyses et suggestions** (`AiAnalysisService`), **job de queue** `RunAiChat` : `AI_ANALYSIS_TIMEOUT_MS`, 120 s, passé via la nouvelle option `timeoutMs` d'`AiChatOptions`.

Les constantes vivent dans `shared/constants/ai.ts`.

- `runWithTimeout` transmet un `AbortSignal` au SDK (la requête HTTP est réellement annulée) et fait la course avec un minuteur (un SDK qui ignorerait le signal reste borné).
- `sdkClientOptions` construit les clients avec le même délai et une seule relance (`AI_SDK_MAX_RETRIES`) au lieu de deux.
- À l'échéance, la nouvelle erreur `AiProviderTimeoutError` (504, `app/exceptions/ai_errors.ts`) remonte. Les contrôleurs IA la traduisent en flash `flash.ai.timeout`, dans les deux locales. Les analyses affichaient jusqu'ici le message générique `flash.ai.analysisError`.
- Les tokens réservés sont libérés par le `finally` de `withReservedTokens` : il n'y avait rien à ajouter, le test le vérifie.
- Assistant en BYOK : un délai dépassé n'est plus présenté comme une clé invalide (`flash.assistant.customKeyFailed`).

## Choix

- **Les chats publics restent synchrones.** Un tour est court et interactif. Avec 30 s, aligné sur le timeout idle de Caddy, une requête ne peut plus occuper le serveur au-delà d'une connexion que Caddy aurait déjà coupée. La raison est documentée dans `docs/domain/public-ai-surface.md`.
- **Pas d'annulation à la déconnexion du client.** Il faudrait faire traverser un signal à chaque service de chat, alors que le gain est désormais borné par le délai.

## Tests

- `tests/unit/services/ai_service.spec.ts` couvre `runWithTimeout` : fournisseur muet, SDK qui rejette sur abort, erreur avant l'échéance rendue telle quelle, réponse dans le délai. Il vérifie aussi les options des quatre clients.
- `tests/integration/services/ai_analysis_service.spec.ts` : une analyse passe 120 s ; un délai dépassé remonte, remet `reserved_tokens` à 0 et ne persiste rien.
- `tests/functional/ai/public_diagnosis.spec.ts` : flash dédié et aucune conversation créée.
- `tests/functional/assistant/assistant_chat.spec.ts` : un délai dépassé en BYOK n'est pas présenté comme une clé cassée.
- Le fake `swapAiService` accepte un tour `{ error }` et capture `timeoutMs`.
