# 2026-10-13 — Assistant hors-ligne : aide produit locale et questions en attente du réseau (#971)

Fait partie de l'épic #949 (Mode traversée), phase 4. Le copilote passe par Mistral, côté serveur : en traversée, il était muet, alors que c'est là que l'équipage a le plus besoin d'aide.

- **Recherche partagée.** L'algorithme de `AssistantProductHelpService` (normalisation, score mots-clés > titre > corps, trois meilleures entrées) passe dans `shared/helpers/product_help_search.ts` (`searchProductHelp`). Le service l'enveloppe et réexporte les fonctions. `ProductHelpHit` rejoint `shared/types/assistant.ts`.
- **Panneau hors-ligne.** Quand la connectivité n'est pas `online` (#953), `AssistantPanel` affiche `AssistantOfflinePane.vue` :
  - un bandeau « Mode hors-ligne — réponses limitées » ;
  - les réponses de l'aide produit (badge « Aide FleetAi », lien `navTarget`, « Voir aussi ») ;
  - la liste des questions en attente.
  - Ce mode est offert à tous les plans, Starter compris.
- **Base produit en import dynamique.** Chunk de ~50 Ko gzippés, hors du bundle principal et précaché par le service worker, donc disponible sans réseau.
- **Questions en attente** (`use_assistant_offline.ts`).
  - Une question sans réponse locale, ou reposée via « Poser aussi à l'assistant au retour du réseau », est gardée dans `localStorage` avec sa page et son fuseau.
  - Au retour du réseau, le layout l'envoie après la file de saisies, sur la conversation active ou une nouvelle. Un toast annonce les réponses, avec un bouton pour ouvrir le panneau.
  - Un refus (quota) retire la question, une coupure la garde, une proposition d'action à confirmer suspend l'envoi.
- **Hors périmètre.** Les réponses factuelles sur le bateau depuis les pages en cache (échéances, heures moteur, dernier plein) restent à cadrer.
- **i18n.** `assistant.offline.*` (FR/EN). **Copilote** : entrée `assistant-offline`.
- **Tests.**
  - Japa unit : `tests/unit/helpers/product_help_search.spec.ts` (parité avec le service).
  - Vitest : `use_assistant_offline.spec.ts`, `assistant_offline_pane.spec.ts`, et le layout (`default_layout_sidebar.spec.ts`) pour l'ordre file de saisies → questions.
