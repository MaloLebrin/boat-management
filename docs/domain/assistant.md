# Copilote FleetAi (assistant) — Documentation technique

> Chat contextuel global de l'app (#602, élargi par #642). Le copilote répond sur les données de l'organisation via des outils appelés par le modèle, explique le produit FleetAi via une base de connaissance curée, et répond à la culture nautique générale en la signalant. La seule écriture reste la proposition de tâche de maintenance confirmée par l'utilisateur.

---

## 1. Architecture

```
AssistantController (Inertia, flash + redirect)
       │
       ▼
AssistantChatService.#exchangeWithQuota      ← withOrgLock + quota mensuel (sauf BYOK)
       │
       ▼
AssistantChatService.#exchange               ← boucle d'outils bornée (#642)
       │        │
       │        ├── AiService.chat(…, { tools })      façade 4 fournisseurs (function calling)
       │        ├── AssistantToolsService.run(...)    exécution bornée à l'org
       │        └── parseAssistantReply(...)          contrat JSON + relance corrective
       ▼
AiAssistantConversation (blob messages)      ← un seul save par tour
```

- **Contexte injecté** : le roster (bateaux + moteurs) et le digest planning restent injectés dans le prompt système à chaque tour (`AssistantContextService`) — les questions simples se résolvent sans outil, donc sans surcoût.
- **Boucle d'outils** (`#exchange`) : tant que le modèle renvoie des appels d'outils, ils sont exécutés et leurs résultats repoussés dans le fil. Bornes : `ASSISTANT_MAX_TOOL_ROUNDS` (3) et `ASSISTANT_MAX_TOOL_CALLS_PER_TURN` (6). Budget de conversation franchi en cours de boucle → un dernier appel **sans** outils obtient la réponse finale.
- **Relance corrective** : une réponse finale hors contrat déclenche UNE relance (« réponds uniquement par l'objet JSON »), puis `AiInvalidResponseError` — rien n'est persisté en cas d'échec (invariant #602/#634).
- **Échafaudage de tour** : les messages d'outils ne sont **jamais** stockés dans la conversation. Seuls le message utilisateur et la réponse finale entrent dans le blob (fenêtre d'historique de 12 messages préservée). Les tokens de tous les appels du tour sont sommés puis émargés une seule fois (`recordUsage`).

## 2. Function calling (façade IA)

`AiService.chat(messages, { tools })` retourne `{ content, toolCalls, tokensUsed }` — `toolCalls` toujours présent, vide par défaut. Traductions par fournisseur (fonctions pures exportées, testées sans réseau) :

| Fournisseur      | Outils                  | Appels                            | Résultats                                        |
| ---------------- | ----------------------- | --------------------------------- | ------------------------------------------------ |
| Mistral / OpenAI | `tools` type `function` | `tool_calls` du message assistant | rôle `tool` + `tool_call_id`                     |
| Anthropic        | `input_schema`          | blocs `tool_use`                  | blocs `tool_result` dans un message `user`       |
| Google           | `functionDeclarations`  | parts `functionCall`              | parts `functionResponse` (nom retrouvé via l'id) |

Tolérance au petit modèle (`mistral-small-latest` par défaut) : arguments coercés (`"22"` → `22`), JSON d'arguments invalide dégradé en `{}`, nom d'outil inconnu → liste des noms valides, appel accompagné de texte traité comme un appel.

## 3. Les dix outils (`AssistantToolsService`)

| Outil                     | Enveloppe                                                                           | Garde                                      |
| ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `list_boats`              | `BoatListService.listForUser`                                                       | `boats.view`                               |
| `get_boat`                | `BoatHullService.getFullDetailForUser` + conformité Division 240 + budget optionnel | `boats.view`                               |
| `get_engine`              | moteur résolu borné org + pièces (`listForEngine`, `listLowStock`)                  | `boats.view`                               |
| `list_maintenance`        | planning (`PlanningService`) ou historique (`BoatMaintenanceService`) selon `scope` | `maintenance.view`                         |
| `fleet_overview`          | `DashboardService.getForUser`                                                       | `boats.view`                               |
| `list_ports`              | `PortService.listWithSpotsForOrg`                                                   | `ports.view` + `canManagePorts`            |
| `list_operations`         | journal / carburant / incidents selon `kind`                                        | `boats.view`                               |
| `list_commercial`         | réservations / clients / factures selon `kind`                                      | `invoices.view` + un flag commercial actif |
| `search_product_help`     | base de connaissance produit                                                        | aucune                                     |
| `get_organization_status` | quotas effectifs + usage + abonnement                                               | `subscription.view`                        |

**Cloisonnement** : l'utilisateur et l'organisation viennent toujours du contexte authentifié, jamais des arguments du modèle. Un id passé en argument est résolu par un service qui filtre déjà sur `organizationId` (`getFullDetailForUser` lève `BoatNotFoundError`) ou par une requête bornée aux bateaux de l'org. Aucun outil d'écriture. `definitionsFor(user)` filtre par capability du rôle ET par flags de plan **effectifs** (tier + modules + add-ons, via `OrganizationModuleService.getEffectiveQuotas`). `run()` ne lève jamais : toute erreur devient `{ error }` renvoyé au modèle.

**Bornage** : formes compactes (listes plafonnées, champs explicites), sérialisation tronquée à `ASSISTANT_TOOL_RESULT_MAX_CHARS` (4000) avec `truncated: true`.

## 4. Base de connaissance produit

`shared/constants/assistant/product_knowledge.ts` : entrées curées FR/EN (titre, corps 400–800 caractères, mots-clés normalisés, `navTarget`, `planFlag`), rédigées depuis `docs/domain/*.md`, les FAQ marketing et `shared/types/plan.ts`. `AssistantProductHelpService.search` normalise la question (minuscules, accents), score mots-clés > titre > corps, renvoie les trois meilleures entrées — déterministe, donc testable. **Règle CLAUDE.md : toute nouvelle feature ajoute son entrée.**

## 5. Contrat de sortie

`AssistantAiReply` (shared/types/assistant.ts) — la forme `answer` porte deux champs optionnels :

- `source` : `fleet_data` | `product` | `general` — rendu en **badge i18n** sous la bulle, jamais en phrase du modèle (c'est ainsi qu'une réponse de connaissance générale est « signalée comme telle »).
- `navTarget` : vocabulaire fermé de 20 routes nommées existantes (`ASSISTANT_NAV_TARGETS`, avec chemin + clé i18n), validé côté serveur (`parseAssistantReply` ignore une valeur inconnue plutôt que de lever) puis rendu en `<Link>`.

Le plafond annoncé de `message` pour `answer` est de 1500 caractères (600 avant #642). Le rendu reste `whitespace-pre-line`, sans Markdown.

## 6. Limites et affichage de la consommation

- `ASSISTANT_CONVERSATION_TOKEN_BUDGET` : 250 000 tokens par conversation (100 000 avant #642 — un tour outillé coûte deux à trois appels). Sans effet sur le quota mensuel de l'organisation.
- La prop partagée `assistantConversation` (optional, enveloppée) porte aussi `aiUsage { used, limit }` — même paire que la page de facturation (`AiTokenQuotaService.getUsage` + `PLAN_LIMITS[plan].aiTokensPerMonth`). Rendue en pied de panneau, avertissement avec lien `/settings/billing` au-delà de 80 % (`ASSISTANT_AI_USAGE_WARNING_RATIO`). Le `tokensUsed` de la conversation reste privé (règle du transformer).

## 7. Risque assumé

`AiTokenQuotaService.withOrgLock` est un mutex en mémoire tenu pendant tout le tour : avec trois allers-retours, une question sérialise les appels IA de l'organisation pendant dix à vingt secondes. Le nombre de tours reste donc bas ; sujet à revoir si l'app passe à plusieurs processus.

## 8. Tests

- `tests/unit/services/ai_service.spec.ts` — traduction des messages/outils par fournisseur.
- `tests/unit/services/assistant_prompt_service.spec.ts` — prompt, parse (`source`/`navTarget`), validité des cibles de navigation contre le routeur et les deux locales, troncature.
- `tests/functional/assistant/assistant_tools.spec.ts` — filtrage par rôle et par plan, cloisonnement inter-org, coercion.
- `tests/functional/assistant/assistant_chat.spec.ts` — boucle scriptée (fake `AiService` en file de réponses) : outil exécuté, bornes, relance corrective, tokens sommés, rien persisté en échec.
- `tests/inertia/assistant_message.spec.ts` / `assistant_panel` — badge de source, lien de navigation, pied de consommation.
