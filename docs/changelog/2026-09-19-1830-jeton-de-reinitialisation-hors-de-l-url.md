# 2026-09-19 — Le jeton de réinitialisation ne survit plus dans une URL (#770)

Les redirections de l'app recopient par défaut la query string de la requête
courante vers la destination. Un jeton qui circule en query string se propageait
donc aux URL suivantes, y compris celles de pages authentifiées qui, elles,
chargent des ressources externes.

- **Cause.** `config/app.ts` active `forwardQueryString: true` globalement, et
  `GuestMiddleware` le redemandait explicitement
  (`ctx.response.redirect(this.redirectTo, true)`). Un utilisateur connecté —
  cas banal, `config/session.ts` donne `age: '5d'` et
  `clearWithBrowser: false` — qui clique sur son lien de réinitialisation était
  redirigé vers `/dashboard?token=<jeton encore valide>`. De là, le jeton
  partait dans l'historique du navigateur, dans les journaux d'accès du reverse
  proxy, et dans le `Referer` des sous-requêtes de la page : la CSP autorise
  `res.cloudinary.com` en `imgSrc`, donc Cloudinary recevait l'URL complète dès
  l'affichage d'une photo de bateau. Le jeton reste utilisable jusqu'à son
  expiration (1 h) ou sa consommation.
- **Correctif 1 — la redirection.** `GuestMiddleware` redirige avec
  `.withQs(false)`, explicite parce que le report est actif globalement.
- **Correctif 2 — le jeton sort de l'URL.** `GET /reset-password?token=…`
  range le jeton en session et rejoue la page sans query string. Le jeton ne
  traverse donc l'URL que le temps d'une requête ; le formulaire le reçoit en
  prop et le poste dans le corps de la requête, et `update` l'oublie de la
  session une fois consommé.
- **Correctif 3 — `Referrer-Policy`.** Nouveau
  `SecurityHeadersMiddleware` : `strict-origin-when-cross-origin` sur toutes
  les réponses. Défense indépendante des deux premières, qui couvre aussi les
  jetons d'invitation (eux aussi en query string). Posé au niveau
  `server.use` et non par Shield, que `start/kernel.ts` retire du pipeline en
  test — un en-tête posé par Shield ne serait couvert par aucun test.
- **Deux tests figeaient le bug.** `reset_password.spec.ts` assertait
  `location === '/dashboard?token=…'` avec le commentaire « sans conséquence —
  la page de destination l'ignore ». La page l'ignore ; le navigateur, le
  reverse proxy et Cloudinary, non. Et `guest_middleware.spec.ts` lisait l'API
  à l'envers (« le second argument vide la query string » : il la conserve).
  Les deux sont inversés, avec l'explication.
- **Tests.** `tests/functional/auth/reset_token_url_leak.spec.ts` : la
  redirection `guest` ne porte plus aucune query string, un visiteur arrivant
  avec `?token=` est rejoué sans, la page rejouée reçoit bien le jeton depuis
  la session, le parcours complet de réinitialisation fonctionne toujours de
  bout en bout, une visite sans jeton ne boucle pas, et l'en-tête
  `Referrer-Policy` est présent sur une page publique comme sur une page
  authentifiée.
- **Hors périmètre.** `forwardQueryString: true` reste actif en global : le
  basculer touche toutes les redirections de l'app et demande sa propre
  validation. `docs/domain/auth-acl.md` note qu'une route portant un paramètre
  sensible doit s'en extraire explicitement.
