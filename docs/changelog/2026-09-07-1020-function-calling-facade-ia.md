# 2026-09-07 — Function calling dans la façade IA (#642)

Premier lot du copilote élargi : la façade `AiService` sait désormais proposer des outils au modèle et récupérer ses appels, sur les quatre fournisseurs, sans changement de comportement pour les appelants existants.

- **Types.** `AiToolDefinition` (nom, description, JSON Schema) et `AiToolCall` (id, nom, arguments) dans `shared/types/ai.ts` ; `AiChatOptions` gagne `tools`.
- **Contrat.** `AiService.chat()` retourne `{ content, toolCalls, tokensUsed }` — `toolCalls` toujours présent et vide par défaut : les appelants existants qui déstructurent `{ content, tokensUsed }` ne changent pas. `AiChatMessage` (type local du service) gagne le rôle `tool` et les champs `toolCalls` / `toolCallId`.
- **Adaptateurs.** Traductions pures exportées par fournisseur : `tools` de type `function` chez Mistral et OpenAI (rôle `tool` + `tool_call_id`), blocs `tool_use` / `tool_result` chez Anthropic (résultats regroupés dans un message `user`), `functionDeclarations` / `functionCall` / `functionResponse` chez Google (nom du résultat retrouvé via l'id d'appel, id synthétique quand Gemini n'en rend pas).
- **Tolérance.** Arguments d'appel string JSON ou objet selon le SDK — parse tolérant, JSON invalide dégradé en `{}`.
- **Tests.** `tests/unit/services/ai_service.spec.ts` : traduction des messages et des définitions par fournisseur, parse des appels — sans réseau.
