# Panneaux de chat IA : composable `useChatConversation`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (deuxième
composable).

## Problème

Les trois panneaux de chat IA — diagnostic public (#602), recherche de
références publique et recherche de références de l'app connectée (#634) —
recopiaient le même socle, les deux derniers étant explicitement « décalqués de
`DiagnosisChatPanel` » : états `processing` / `pendingMessage` / `startingNew`,
calcul de `showThread` et du mode du composer (départ, réponse, aucun), et
visite `router.post` avec son `preserveScroll`, son rechargement partiel
`only` et le même trio `onStart` / `onFinish` de remise à zéro. Une correction
sur la bulle optimiste ou sur le redémarrage local devait être portée trois
fois.

## Changement — comportement inchangé

- `inertia/composables/use_chat_conversation.ts` :
  `useChatConversation({ conversation, startUrl, replyUrl, only, canStart? })`
  → `{ processing, pendingMessage, showThread, composerMode, submit, startNew }`.
  - `composerMode` : `start` sans conversation (ou après `startNew`), `reply`
    sur une conversation active, `null` sur une conversation terminée ;
  - `canStart` ferme le seul composer de départ — c'est le quota de
    conversations gratuites des deux chats publics ; le chat de l'app
    connectée, sans plafond de conversations, l'omet ;
  - `submit` poste la charge utile complète sur `startUrl` au premier message,
    puis seulement `{ message }` sur `replyUrl` — les champs de contexte
    (type de moteur, marque, heures, numéro de série) ne partent qu'une fois ;
  - les URL sont calculées à l'envoi, donc une conversation fraîchement
    revenue du serveur est prise en compte sans remonter le panneau.
- Les trois panneaux adoptent le composable (−114 / +35 lignes). `router` et
  `ref` ne sont plus importés par eux ; le bouton de nouvelle conversation
  appelle `startNew()` au lieu d'écrire dans un `ref` depuis le template.
- `SparePartsChatPanel` dérive le repli manuel et l'URL des conversations
  d'une seule racine `sparePartsUrl` (l'URL du chat était recomposée à la
  main). Son composer émettant le texte seul, un `submitMessage(message)`
  local rend la charge utile `{ message }`.

## Tests

- **Caractérisation avant** : `tests/inertia/chat_panels_conversation.spec.ts`
  (13 tests, verts sur le code d'origine puis après migration) : mode du
  composer dans les cinq situations, requête exacte des six routes (URL de
  départ et de réponse, charge utile, `only` — avec `quota` côté public,
  sans côté app), bulle optimiste et indicateur de réflexion pilotés par
  `onStart` / `onFinish`, quota épuisé sans composer, redémarrage local qui
  masque le fil et rouvre le composer de départ.
- `tests/inertia/use_chat_conversation.spec.ts` (10 tests, écrits avant le
  composable) : les cinq modes du composer, `canStart` qui ne ferme jamais la
  réponse, `startNew` (y compris sur un quota épuisé), charge utile de départ
  et de réponse, cycle de vie de la visite, URL calculée à l'envoi.
- `tests/inertia/parts_ai_panel.spec.ts` (spec existante du panneau)
  inchangée et verte ; suite Vitest complète (2392 tests) et `pnpm lint`
  verts. `pnpm typecheck` : même nombre d'erreurs préexistantes qu'avant le
  changement (codegen `.adonisjs` absent hors CI), aucune sur les fichiers
  touchés.
