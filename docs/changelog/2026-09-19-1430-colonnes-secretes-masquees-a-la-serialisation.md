# 2026-09-19 — Colonnes secrètes masquées à la sérialisation (#782)

Le repo ne comptait que **deux** `serializeAs: null` — `users.password` et
`organization_ai_keys.api_key_encrypted` — alors que d'autres colonnes
stockent la même catégorie de valeur.

- **Cause.** La règle « une colonne secrète porte `serializeAs: null` » était
  appliquée à deux endroits et rien ne la rappelait au modèle suivant.
  `password_reset_tokens.token` et `organization_invitations.token` s'en
  étaient passés. Aucune fuite actuelle : ces modèles ne sont ni passés en
  prop Inertia, ni renvoyés en JSON, et la valeur stockée est un SHA-256, pas
  le token envoyé par e-mail. Le hash reste néanmoins utile à qui l'obtient —
  `verifyToken` cherche l'enregistrement **par hash**.
- **Correctif.** `serializeAs: null` sur les deux colonnes `token`.
- **Recensement.** Le parcours demandé par l'issue a sorti un quatrième cas,
  plus sérieux que les deux premiers : `push_subscriptions`. `endpoint`,
  `p256dh` et `auth` forment ensemble une **capacité** — ces trois valeurs
  suffisent à pousser une notification dans le navigateur d'un utilisateur
  sans passer par l'app. Les quatre colonnes (avec `endpointHash`) sont
  désormais masquées ; l'écran de réglages passait déjà par
  `PushSubscriptionTransformer.toRow`, donc rien ne change côté UI.
  `simulator_shares.token` reste volontairement exposé (lien public par
  conception), de même que les tokens de conversation IA, qui sont des
  identifiants portés par l'URL.
- **Tests.** `tests/unit/hygiene/secret_model_columns.spec.ts` prend la
  question à l'envers : toute colonne dont le nom contient `token`, `secret`,
  `key`, `hash` ou `password` doit être masquée, **sauf** inscription motivée
  dans l'allowlist du test. Un second volet couvre les colonnes que le lexique
  ne peut pas nommer (`p256dh`, `auth`, `endpoint`), et un troisième empêche
  l'allowlist de survivre aux colonnes qu'elle excuse. Vérifié en retirant le
  `serializeAs: null` de `password_reset_tokens.token` : le test passe au
  rouge en nommant la colonne. `tests/support/model_columns.ts` lit les
  sources de `app/models/` plutôt que d'importer les 67 modèles — un test de
  forme n'a pas à amorcer l'application.
