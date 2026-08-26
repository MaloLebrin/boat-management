# 2026-08-26 — Doc récapitulative de l'épic #481 et plan de merge

L'épic « PWA de terrain » (#481) est livrée en 16 PRs empilées sur 3 piles + 4 indépendantes ; le repo mergeant en squash, l'ordre de merge et les rebases des PRs enfants ne sont pas évidents à reconstituer depuis les PRs seules.

- **`docs/architecture/pwa-terrain-epic-481.md`** (nouveau) : tableau des 18 livraisons par lot avec liens PR, décisions structurantes (racine web du build, file hors-ligne v2, contrats Web Push, pièges de test), et **plan de merge** pas à pas — préalables (#557 d'abord, #558 à fermer), les 3 piles dans l'ordre, la commande de rebase après chaque squash, les conflits attendus fichier par fichier et leur résolution, les actions post-merge (clés VAPID, migration, vérification iPhone réel).
