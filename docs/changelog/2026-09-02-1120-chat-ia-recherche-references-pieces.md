# 2026-09-02 — Chat IA de recherche de références de pièces par numéro de série (#634)

Le parcours pièces détachées (#517 → #575) était une identification par navigation : le `serialNumber` stocké sur les moteurs n'était jamais exploité, alors que `engine_brands.reference_pattern` sait décoder les codes plaque et que l'écran avertit déjà qu'« un même code plaque couvre plusieurs variantes que le numéro de série départage ». Cette livraison ajoute la **Phase 1** de l'issue #634 : un chatbot conversationnel, réservé à l'app connectée, qui identifie le modèle moteur puis retrouve la référence de la pièce demandée. La Phase 2 (chat public marketing) fera l'objet d'une livraison séparée.

## Parcours

- **Deux entrées** : une carte navy « Assistant IA » sur `/spare-parts` (sélecteur de moteur de la flotte) et sur la page d'identification d'un moteur (`/boats/:boatId/engines/:engineId/spare-parts`). Plan sans IA (`starter`) → `UpgradePlanModal`, aucune navigation ; le backend garde aussi chaque route (`QuotaService.assertCanUseAI`).
- **Page dédiée** `GET /boats/:boatId/engines/:engineId/spare-parts/chat` (`spareParts.chat.show`), mutations `POST …/chat/conversations` (`spareParts.chat.start`) et `POST …/chat/conversations/:token/messages` (`spareParts.chat.message`) sous `aiThrottle`, réponses en redirections Inertia (flash + `redirect().back()`), rechargement partiel `only: ['conversation', …]`.
- **Machine à états à deux phases**, portée par la colonne `phase` : `engine` (identification du modèle à partir du numéro de série et du motif de plaque de la marque) puis `part` (choix de la pièce). **Court-circuit** : un moteur dont le modèle est déjà résolu par le catalogue (#573) démarre directement en phase `part`, sans dépenser un token d'identification ; une marque hors catalogue assume l'échec d'emblée et passe aussi en phase `part`.

## Anti-hallucination

- **Le LLM ne produit jamais de référence.** Il ne rend que des identifiants du vocabulaire injecté dans son prompt : un `modelCode` de la liste des modèles de la marque, un `partKey` du `SPARE_PART_CATALOG_INDEX` filtré par la famille du moteur (#574). Le backend revalide tout : code rapproché par `EngineCatalogService.resolveModelForEngine`, clé contrôlée contre le vocabulaire (clé inventée → `AiInvalidResponseError`, rien n'est persisté).
- **La référence affichée provient exclusivement de `engine_part_references`**, servie par `SparePartsReferenceSource` (toujours sourcée, invariant #575). Pièce sans référence connue → repli sur les liens revendeurs de #517 + lien vers la vue éclatée de l'ensemble. Aucune pièce du catalogue ne correspond → renvoi honnête vers l'identification manuelle.
- **Échec d'identification honnête** : le message « modèle non identifié » et le repli vers la navigation manuelle sont des textes statiques i18n décidés côté backend (`context.identificationFailed`), jamais délégués au modèle.

## Backend

- **Table `ai_part_search_conversations`** (migration avec rollback), calquée sur `ai_diagnosis_conversations` (#602) : fil en blob JSON, `token` unique, FK `user_id`/`organization_id`/`boat_engine_id`/`identified_engine_model_id` en `SET NULL` (suivi des coûts `tokens_used`), colonnes `phase`, `context` (snapshot du moteur), `result`.
- **`SparePartChatService`** : appel Mistral synchrone dans la requête, cycle de quota canonique (`AiTokenQuotaService.withOrgLock` → `assertCanUseTokens` → `recordUsage`), plafond de 10 messages utilisateur avec instruction de clôture au dernier tour, propriété prouvée par (`userId`, `boatEngineId`).
- **`spare_part_chat_prompt_service`** (pur, fr/en) : prompt système par phase — motif de référence + liste `nom — code plaque` en identification, `clé — intitulé catalogue` en choix de pièce — et parseur strict (`type` étranger à la phase → réponse invalide).
- **Extraction** : la projection `engineProps` du contrôleur pièces détachées devient `BoatEngineSparePartsService.getEngineProps()`, partagée par les trois écrans (identification, ensemble, chat) — forme `SparePartsEngineProps` inchangée.
- Types dans `shared/types/spare_part_chat.ts`, erreurs dans `app/exceptions/spare_part_chat_errors.ts`, transformer sans `tokensUsed`.

## Frontend

- Nouveaux composants `inertia/components/spare_parts/chat/` : `SparePartsAiEntryCard` (carte navy, gating plan), `SparePartsChatPanel` (bulle optimiste pendant l'appel synchrone, encart d'échec d'identification), `SparePartsChatMessage` (libellés vouvoyés du namespace `parts` — les clés du chat public tutoient), `SparePartsChatComposer`, `SparePartsChatResultCard` (référence sourcée + ajout au panier de réparation existant, ou replis).
- i18n : nouveau sous-objet `parts.ai` et clés `flash.spareParts.chat*` dans les deux locales, vouvoiement côté FR.

## Tests

- `tests/functional/spare_parts/spare_part_chat.spec.ts` (17 cas) : rendu de page, gating starter, court-circuit de phase, prompts par phase, identification réussie/échouée, référence servie depuis la base (le leurre du LLM ne sort jamais), replis, clé hors vocabulaire non persistée, conversation verrouillée, plafond de messages, propriété, quota de tokens bloquant et émargé.
- `tests/unit/services/spare_part_chat_prompt_service.spec.ts` (11 cas) : builders (motif, vocabulaire, consignes anti-référence, replis) et parseur (types par phase, JSON invalide).
- Vitest : `spare_parts_ai_entry_card.spec.ts` (navigation par plan, sélecteur, modal d'upgrade), `spare_parts_chat_result_card.spec.ts` (référence sourcée, ajout panier, replis revendeurs/manuel), `spare_parts_chat_message.spec.ts`.
