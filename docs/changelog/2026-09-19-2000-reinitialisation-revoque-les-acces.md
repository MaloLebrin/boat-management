# 2026-09-19 — La réinitialisation du mot de passe coupe les accès existants (#763)

Un utilisateur qui pense son compte compromis change son mot de passe. C'est
l'action qu'on attend de lui, et celle que la page « mot de passe oublié » met
en avant. Elle ne révoquait rien.

- **Cause.** `update` faisait trois choses : vérifier le token, écrire le
  nouveau mot de passe, supprimer les **liens** de réinitialisation. Aucun
  **accès** n'était coupé. Survivaient donc au changement : les sessions
  ouvertes (`age: '5d'`, `clearWithBrowser: false`) et les remember-me tokens
  (`rememberMeTokensAge: '30d'`). Le second est le pire des deux : ce cookie
  suffit à se réauthentifier, le mot de passe ne sert plus à rien. La victime
  changeait son mot de passe, voyait un message de succès, et l'attaquant
  restait connecté un mois.
- **Correctif.** `PasswordResetService.revokeAllAccess(user)` supprime les
  remember-me tokens un par un via l'API du provider (`User.rememberMeTokens`),
  puis date `users.sessions_valid_after` (nouvelle colonne, migration avec
  `down()`). `RevokedSessionMiddleware` compare cette date à l'estampille de
  la session courante et déconnecte vers `/login` si la session est
  antérieure.
- **La stratégie d'invalidation des sessions, qui était le vrai point de
  conception.** Avec `SESSION_DRIVER=cookie` — le défaut documenté dans
  `.env.example` — les sessions ne sont pas listables côté serveur : il n'y a
  aucune table à vider, donc le discriminant doit être porté par
  l'utilisateur. Une bascule vers `SESSION_DRIVER=database` aurait été l'autre
  option ; elle impose un choix d'exploitation là où une colonne suffit.
- **Le piège, rencontré et corrigé pendant l'implémentation.** L'estampille de
  session doit être posée **à la connexion** (`stampAuthSession()` sur les
  trois points d'entrée : connexion, inscription, démo) et jamais
  paresseusement par le middleware. Posée au vol, la session de l'attaquant
  se réestampillerait à « maintenant » et survivrait ; pas posée du tout, la
  connexion légitime qui **suit** une réinitialisation se faisait couper dès
  sa première requête — ce qu'un premier jet faisait, et que les tests ont
  attrapé. Une session sans estampille est donc traitée comme antérieure à
  toute révocation (échec fermé), ce qui est sans effet sur l'existant :
  `sessions_valid_after` vaut `null` pour tout le monde jusqu'à la première
  réinitialisation, personne n'est déconnecté par la migration.
- **Changement depuis les réglages.** `PUT /settings/password` applique la
  même révocation, puis réestampille la session courante avec la valeur même
  de `sessions_valid_after` : la comparaison étant stricte (`<`), une
  estampille égale survit. Celui qui agit reste connecté, ses autres appareils
  non — nouvelle clé
  `flash.settings.passwordUpdatedOtherDevicesSignedOut` dans les deux locales,
  plus `flash.auth.sessionRevoked` pour la déconnexion elle-même.
- **Tests.** La comparaison estampille / `sessionsValidAfter` est prouvée par
  `tests/unit/middleware/revoked_session_middleware.spec.ts` — sept cas, dont
  l'égalité stricte dont dépend le changement depuis les réglages, l'échec
  fermé sur session non estampillée, et l'estampille illisible. Le niveau
  fonctionnel
  (`tests/functional/auth/password_reset_revokes_access.spec.ts`) couvre les
  effets observables : remember-me supprimés, `sessionsValidAfter` posé,
  session non estampillée refusée, plus deux témoins (une reconnexion marche,
  un autre compte n'est pas déconnecté).
  ⚠️ Suivre **la même** session de part et d'autre d'une réinitialisation
  n'est pas faisable en fonctionnel : le plugin api-client de Japa isole le
  magasin de sessions par requête, et rejouer le cookie `adonis-session` ne
  ressuscite pas la session (vérifié). D'où le partage des rôles ci-dessus.
