# 2026-09-19 — Un limiteur sur l'inscription (#766)

Les quatre POST du groupe d'authentification sont sous `middleware.guest()`.
Trois portaient `authThrottle`. Le quatrième — l'inscription, c'est-à-dire
celui qui **écrit** — ne portait rien.

- **Cause.** Une omission, d'autant plus visible que le repo throttle
  systématiquement ses routes publiques qui écrivent (`/contact`, les trois
  POST du simulateur, `/demo`, les deux chats IA publics, les abonnements
  push). L'inscription était la seule route publique d'écriture non bornée.
  Sans compte et sans limite : autant d'utilisateurs et d'organisations que
  voulu, les effets de bord du parcours de création à chaque fois, et —
  l'absence de vérification d'e-mail aidant — des comptes portant l'adresse de
  tiers.
- **Correctif.** `signupThrottle` dédié, 5 requêtes par **heure** et par IP.
  Fenêtre à l'heure et non à la minute : une inscription légitime est un
  événement rare, et les 10/min d'`authThrottle` ne bornent rien sur la durée.
- **Le débit, et pourquoi 5 plutôt que 3.** L'arbitrage est celui que
  documente déjà `simulatorLeadThrottle`, pris dans l'autre sens. Une marina
  qui ouvre les comptes de son équipe le jour de son onboarding est derrière
  une seule IP, et trois créations d'affilée y sont un scénario ordinaire.
  5/h laisse passer cette séance tout en ramenant le plafond quotidien de
  « illimité » à 120.
- **Le refus est un message, pas une 429 brute.** `app/exceptions/handler.ts`
  ne traitait ce cas que pour `demo.login`. La condition devient une allowlist
  `nom de route → clé i18n`, et non une règle générale : les trois POST du
  simulateur et les chats IA publics répondent à du JavaScript qui lit le
  statut, et leur rendre une 302 masquerait le refus au lieu de le signaler.
  Sur un formulaire pleine page, en revanche, une 429 brute est un cul-de-sac.
  Nouvelle clé `flash.auth.signupRateLimit` dans les deux locales.
- **Tests.** `tests/functional/auth/signup_throttle.spec.ts` : au-delà du
  débit l'inscription est refusée **et aucune ligne n'est créée** — un
  limiteur qui refuse après l'écriture ne borne rien —, le refus est bien une
  redirection flashée, et un témoin vérifie qu'une inscription normale n'est
  pas touchée.
