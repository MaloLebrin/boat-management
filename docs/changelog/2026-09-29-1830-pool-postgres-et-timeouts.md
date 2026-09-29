# 2026-09-29 — Pool Postgres, timeouts de session et SSL paramétrables (#854)

Deux réglages de bas niveau absents tant que l'app tournait sur une seule
machine : le pool Knex (défaut implicite `min 2 / max 10`, sans timeout
d'acquire ni de session) et le plafond Transmit mono-instance.

- **Cause.** Sans `statement_timeout`, une requête d'export ou de dashboard mal
  indexée peut tenir une connexion indéfiniment. Sans dimensionnement explicite,
  le plafond `web` + 2 workers × 10 = 30 connexions n'était pas documenté. SSL
  non configurable bloquait un Postgres managé PaaS.
- **Correctif.** `config/database.ts` : pool (`DB_POOL_MAX`,
  `acquireTimeoutMillis: 10s`), `afterCreate` qui pose
  `statement_timeout` / `idle_in_transaction_session_timeout` (défauts 30 s /
  60 s, surchargeables), `ssl` via `DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED`.
  Compose : workers à 5 min / 2 min, migrator à `statement_timeout = 0`.
  Transmit reste `transport: null` — instance `web` unique documentée comme
  choix volontaire (`docs/dev/hosting.md`).
- **Tests.** `tests/integration/config/database_statement_timeout.spec.ts`
  vérifie `SHOW statement_timeout` / `idle_in_transaction_session_timeout` sur
  une connexion du pool.
