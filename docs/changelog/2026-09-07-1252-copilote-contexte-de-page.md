# 2026-09-07 — Copilote : contexte de page courante

Le panneau du copilote joint désormais à chaque message l'URL de la page depuis laquelle l'utilisateur écrit (`pageUrl`, max 300 caractères, jamais stockée). Le serveur la résout en une ligne injectée dans le prompt système — « Page courante de l'utilisateur : Fiche du bateau Pen Duick (#12) » — si bien que « ce bateau », « ce moteur » ou « ici » se comprennent sans être nommés.

## Résolution (`AssistantPageContextService`)

- Pages nommées : correspondance exacte avec les 20 cibles d'`ASSISTANT_NAV_TARGETS`, qui gagnent un `promptLabel` FR/EN.
- Pages d'entité : `/boats/:id` (et sous-pages), `/boats/:boatId/engines/:engineId`, `/clients/:id` — entités résolues par des requêtes bornées à l'organisation (un id d'une autre org ne produit aucune ligne).
- Jamais bloquant : URL inconnue, malformée ou erreur de résolution → simplement pas de section dans le prompt.

## Fichiers principaux

- `app/services/assistant_page_context_service.ts` (nouveau, avec `normalizePath` exporté).
- `app/validators/assistant.ts` (`pageUrl` optionnel), `app/controllers/assistant_controller.ts`, `app/services/assistant_chat_service.ts` (propagation jusqu'au prompt).
- `inertia/components/assistant/AssistantPanel.vue` : `pageUrl: usePage().url` joint aux POST.
