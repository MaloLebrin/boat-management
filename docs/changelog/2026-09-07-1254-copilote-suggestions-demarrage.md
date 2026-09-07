# 2026-09-07 — Copilote : suggestions de démarrage proactives

À l'ouverture du panneau sur une conversation vide, le copilote propose jusqu'à **trois questions de démarrage** en chips cliquables, construites côté serveur depuis l'état réel de la flotte et la page courante :

- tâches en retard (« Quelles sont les N tâches en retard… ») ou, à défaut, échéances proches ;
- la page consultée (fiche bateau → « Quel est l'état du bateau X ? », réservations, navigation, ports) ;
- replis génériques (état général de la flotte, « Que savez-vous faire ? »).

## Fonctionnement

- `app/services/assistant_starter_service.ts` (nouveau) : `buildStarters(user, pagePath)` — jamais bloquant, toute erreur dégrade sur les suggestions statiques.
- Servies dans l'enveloppe de la prop partagée `assistantConversation` (`inertia_middleware.ts`), calculées **uniquement quand aucune conversation n'est active** : zéro coût par navigation et zéro coût après chaque message.
- Texte 100 % i18n : le serveur ne rend que `{ i18nKey, params }` (`assistant.starters.*`, deux locales) ; le clic envoie le libellé rendu comme message utilisateur — avec le contexte de page.
- Front : chips dans `AssistantThread.vue`, ref `starters` dans `use_assistant_panel.ts`.
