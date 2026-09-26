# 2026-09-26 — SSR : le client hydrate l'arbre serveur au lieu de le remonter (#835)

`config/inertia.ts` active le SSR (`inertia/ssr.ts`), mais `inertia/app.ts` montait
l'application avec `createApp`. Vue ignorait alors tout le HTML rendu par le serveur et
recréait l'arbre complet côté client : en build de production, le HTML SSR de `/login`
portait 22 marqueurs de fragments `<!--[-->`, le DOM après chargement n'en gardait aucun.

- **Cause.** `createApp` ne sait pas hydrater : il vide le conteneur et remonte tout.
  Seul `createSSRApp` réutilise les nœuds existants. Conséquences : double rendu (CPU,
  re-création de tous les nœuds, intérêt du SSR limité au premier paint) et perte de
  tout état DOM du premier paint. Effet de bord : les divergences serveur/client
  n'étaient jamais signalées, puisque rien n'était hydraté.
- **Correctif.** `inertia/utils/vue_app_factory.ts` (`pickVueAppFactory`) choisit
  `createSSRApp` quand le conteneur Inertia contient déjà du HTML serveur, `createApp`
  sinon (pattern Inertia officiel `el.hasChildNodes()`, qui garde un montage classique
  si le SSR est désactivé). `inertia/app.ts` l'utilise dans `setup()`.
- **Mismatch corrigé : `BaseModal`.** Une fois l'hydratation réelle, chaque page
  portant une modale (tableau de bord, liste des bateaux…) levait deux
  « Hydration node mismatch » + « Hydration completed but contains mismatches ». Le
  SSR d'Inertia n'injecte que le HTML de `#app` : ce qu'un `<Teleport to="body">` rend
  côté serveur est perdu, et Vue cherchait la modale directement dans `<body>`, où il
  tombait sur du texte étranger. Le Teleport est maintenant `:disabled` tant que le
  composant n'est pas monté (`useMounted()` de VueUse) : le contenu — deux commentaires
  `v-if` quand la modale est fermée — est rendu en place, identique serveur/client, puis
  déplacé dans `<body>` au montage. Aucun changement de comportement pour les 33
  consommateurs ; une modale ouverte dès le SSR s'affiche brièvement dans `#app` avant
  d'être déplacée.
- **Pages vérifiées en dev**, console propre (aucun avertissement `Hydration`, marqueurs
  de fragments conservés dans le DOM) : `/en`, `/fr`, `/login`, `/dashboard`, `/boats`,
  `/boats/:id`, `/planning`.
- **Tests.** `tests/inertia/vue_app_factory.spec.ts` (choix de la fabrique, hydratation
  effective d'un nœud serveur) et `tests/inertia/base_modal_hydration.spec.ts`, qui
  rejoue le cycle `renderToString` → `createSSRApp().mount()` sur `BaseModal` et échoue
  sur le mismatch d'origine (vérifié avant correctif), puis contrôle que la modale
  s'ouvre bien dans `<body>` hors du conteneur.
