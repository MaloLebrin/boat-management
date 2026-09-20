# 2026-09-19 — La connexion est bornée par compte, pas seulement par IP (#767)

`authThrottle` était le seul limiteur de `start/limiter.ts` à ne pas déclarer
de `usingKey`. Il retombait donc sur la clé par défaut, dérivée de l'IP.

- **Cause 1 — le credential stuffing distribué.** Toutes les tentatives d'un
  attaquant depuis une IP étaient comptées ensemble, mais **rien ne comptait
  les tentatives contre un compte**. 10 tentatives/minute/IP, mais depuis 200
  IP résidentielles cela fait 2 000 tentatives/minute sur la même adresse, et
  le compteur de la victime n'existait pas. C'est exactement le modèle
  d'attaque que le bornage par IP ne couvre pas.
- **Cause 2 — un budget partagé entre trois routes.** Le même compteur servait
  `POST /login`, `POST /forgot-password` et `POST /reset-password`. Un
  utilisateur qui se trompait plusieurs fois de mot de passe consommait le
  budget qui lui aurait permis de demander un lien de réinitialisation —
  c'est-à-dire de se sortir d'affaire.
- **Correctif 1.** Trois limiteurs nommés, un par route (`loginThrottle`,
  `forgotPasswordThrottle`, `resetPasswordThrottle`), chacun avec sa clé IP
  explicite.
- **Correctif 2.** Un compteur **par compte**, 10 tentatives par heure,
  consommé dans `SessionController.store` via `penalize()` plutôt que monté en
  middleware. Ce choix n'est pas cosmétique : `penalize` ne décompte que les
  tentatives **en échec**, remet le compteur à zéro sur une connexion réussie,
  et court-circuite la vérification des identifiants une fois le plafond
  atteint. Un utilisateur qui se connecte dix fois dans l'heure depuis
  plusieurs appareils n'est donc pas puni, alors qu'un middleware de route
  l'aurait été.
- **La clé est normalisée** en minuscules, comme le fait `User.normalizeEmail`
  côté modèle : sans ça, changer la casse de l'adresse suffirait à repartir
  d'un compteur vierge.
- **Le message de refus ne dit pas d'où vient le blocage.** Même clé
  (`flash.auth.loginRateLimit`, deux locales) que le compteur vienne de l'IP ou
  du compte — sinon le refus devient un signal sur l'activité visant ce compte.
  À noter : le compteur par compte porte sur l'adresse **tentée**, existante ou
  non, donc il n'est pas non plus un oracle d'existence de compte.
- **Tests.** `tests/functional/auth/login_account_throttle.spec.ts` : le
  compteur par compte bloque même en changeant d'IP à chaque requête (chaque
  tentative part d'un `x-forwarded-for` distinct, sinon le compteur par IP se
  déclencherait le premier et le test prouverait le mauvais mécanisme), la
  casse de l'adresse ne le contourne pas, une connexion réussie le remet à
  zéro, bloquer un compte n'en bloque pas un autre, le message de refus est
  neutre, et un échec de connexion ne ferme plus la demande de
  réinitialisation.
