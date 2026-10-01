# 2026-10-01 — Appareils et sessions connectés, « déconnecter partout » (#885)

Jusqu'ici, un utilisateur qui avait oublié de se déconnecter sur un ordinateur partagé, ou qui soupçonnait un accès indésirable, n'avait qu'un recours : changer son mot de passe. Il ne pouvait ni voir où son compte était ouvert, ni fermer une session précise.

- **Données.** Nouvelle table `user_sessions` : `id` (UUID porté par la session), `user_id`, `remember_me_token_id`, `ip_address`, `user_agent`, `created_at`, `last_seen_at` et `revoked_at`. Nouvelle colonne `users.notify_new_login`, à `true` par défaut. Le store de session ne change pas (`SESSION_DRIVER=cookie` en production) : la table recense les sessions, elle n'en stocke pas le contenu. Le déploiement ne demande aucun changement d'environnement et ne déconnecte personne.
- **Contrôle.** Le nouveau `SessionRegistryMiddleware` lit la ligne de la session à chaque requête authentifiée. Une session dont la ligne est révoquée est renvoyée vers `/login` dès sa requête suivante. `last_seen_at` est mis à jour au plus toutes les 15 minutes. Les sessions déjà ouvertes au déploiement sont recensées à leur première requête.
- **Remember-me.** `User.rememberMeTokens` passe par `TrackedRememberMeTokensProvider`, qui garde le lien entre une session et son remember-me, y compris quand le guard recycle le jeton. Couper une session supprime donc aussi le remember-me qui l'aurait rouverte. Une session restaurée par remember-me est désormais estampillée : avant, un compte qui avait déjà révoqué ses sessions (#763) ne pouvait plus jamais être restauré.
- **Écran.** `/settings/me` gagne une carte « Appareils et sessions ». Elle liste les sessions actives avec l'appareil (« Chrome sur macOS »), l'IP, la dernière activité, et signale « Cette session » et les connexions mémorisées. Routes :
  - `DELETE /settings/sessions/:id` : déconnecte une autre session ;
  - `DELETE /settings/sessions/others` : déconnecte partout sauf ici, révoque les remember-me et date `sessions_valid_after` ;
  - `DELETE /settings/sessions/remembered` : révoque les remember-me antérieurs au registre ;
  - `PUT /settings/sessions/notifications` : active ou coupe l'alerte e-mail.
- **Révocation globale.** Le changement de mot de passe, la réinitialisation et l'activation de la 2FA ferment aussi les lignes des autres sessions. Seule celle de la session qui agit reste ouverte.
- **Nouvel appareil.** Une connexion depuis un couple navigateur + système jamais vu sur le compte envoie l'e-mail « Nouvelle connexion à votre compte FleetAi » (gabarit `emails/new_login`). La toute première connexion recensée n'envoie rien. L'alerte est désactivable.
- **Compte démo.** Il reste hors registre : partagé entre tous les visiteurs, il leur montrerait les IP des autres.
- **Audit.** Nouvelles actions `auth.session_revoked` et `auth.logout_all`.
- **Rétention.** `PurgeExpiredTokens` supprime les lignes inactives depuis plus de 90 jours.
- **Assistant.** Nouvelle entrée `devices-and-sessions` dans la base de connaissance.
- **Tests.**
  - Fonctionnels : enregistrement à la connexion avec le remember-me, adoption, liste limitée au compte, session révoquée renvoyée au login, remember-me révoqué non réutilisable, « déconnecter partout », remember-me orphelins, changement de mot de passe, alerte nouvel appareil.
  - Unitaires : estampille de la session restaurée.
  - Intégration : purge.
  - Vitest : carte et lecture du user-agent.
