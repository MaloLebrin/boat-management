# 2026-09-19 — Cinq secrets typés, et une liste `redact` sur le logger (#769)

`start/env.ts` valide bien toutes les variables au démarrage et utilisait
`Env.schema.secret` — le type qui masque la valeur à la sérialisation et à la
journalisation — pour quatre d'entre elles. Cinq secrets de même nature
étaient restés en `Env.schema.string()`.

- **Cause.** L'incohérence était interne au fichier : dans le même bloc
  Cloudinary, `API_SECRET` était protégé et `API_KEY` ne l'était pas ;
  `VAPID_PRIVATE_KEY` était protégé mais `STRIPE_SECRET_KEY` non. En
  parallèle, `config/logger.ts` ne déclarait aucune liste `redact`, donc rien
  ne rattrapait l'oubli en aval. Les deux moitiés du problème se renforçaient :
  le type protège ce qu'on lit depuis `env`, `redact` protège ce qui transite
  par le logger. Il manquait les deux au même endroit.
- **Correctif, moitié 1.** `DB_PASSWORD`, `CLOUDINARY_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `SMTP_PASSWORD` passent en
  `Env.schema.secret` / `secret.optional()`. Les points de lecture sont
  repris : `config/database.ts`, `config/cloudinary.ts`, `config/mail.ts`,
  `app/services/stripe_service.ts` et `tests/support/stripe.ts` (que l'issue
  ne mentionnait pas — `tsc -b` l'a sorti).
- **Un piège au passage.** Les deux clés Stripe sont vides en test
  (`.env.test`, pour forcer `StripeNotConfiguredError`). `if (!key)` sur un
  `Secret` serait toujours faux, l'objet étant truthy : la lecture fait donc
  `env.get(...)?.release()` **avant** le test de présence.
- **Correctif, moitié 2.** `config/logger.ts` déclare une liste `redact` avec
  `censor: '[redacted]'` : en-têtes `authorization` et `cookie` (sous leurs
  deux formes, `req.headers.*` et `headers.*` — l'objet journalisé est tantôt
  la requête, tantôt l'erreur qui la contient), puis les champs `password`,
  `apiKey`, `api_key`, `secret`, `token`, `accessToken`, `refreshToken`. Le
  risque n'était pas actuel : aucun appel de `app/` ne journalise volontairement
  un secret. Il est structurel — il suffit d'un `logger.error({ err, config })`
  ou d'une erreur `pg`/`nodemailer` qui embarque sa configuration de connexion.
- **Tests.** `tests/unit/config/secrets_and_redaction.spec.ts` tient la règle
  dans les deux sens : **toute** variable dont le nom contient `KEY`, `SECRET`,
  `PASSWORD`, `TOKEN` ou `CREDENTIAL` doit être un `Secret`, sauf inscription
  dans une allowlist « publique par conception » (`STRIPE_PUBLIC_KEY`,
  `VAPID_PUBLIC_KEY`) qui ne peut pas survivre aux variables qu'elle excuse.
  La liste `redact` est vérifiée sur les chemins qu'emprunterait une fuite. Un
  témoin garantit que l'analyse de `start/env.ts` voit bien le fichier — sans
  lui, une regex cassée rendrait tout vert pour de mauvaises raisons.
