# 2026-07-04 — [#183] Dates : `toDateTime()` normalise en UTC (indépendant du TZ serveur)

**Corrige D-08 : `toDateTime()` interprétait les datetimes naïves (sans fuseau) dans la zone locale du process. Les datetimes de navigation et de réservation variaient donc selon le TZ serveur (prod UTC vs dev), faussant les instants stockés (colonnes `timestamptz`)**

Décision retenue : _forcer UTC_ (sémantique « naïve = UTC »).

- `shared/helpers/date.ts` : une datetime naïve est désormais normalisée en UTC, quel que soit le TZ serveur
  - branche `Date` (payload VineJS, parsé en zone locale) : `DateTime.fromJSDate(value).setZone('utc', { keepLocalTime: true })` — on récupère le wall-clock local (= la saisie) et on le ré-étiquette UTC
  - branche string ISO naïve : `DateTime.fromISO(value, { zone: 'utc' })`
  - une datetime avec offset explicite conserve son instant
- Note : la piste littérale de l'issue (`fromJSDate(value, { zone: 'utc' })`) est en réalité incorrecte ici — VineJS parse la datetime naïve en zone locale, donc cette variante donnerait un instant décalé sur un serveur non-UTC. Le `keepLocalTime` est la correction juste (vérifiée sous UTC / America-New_York / Asia-Tokyo)
- Test ajouté : `tests/unit/helpers/date.spec.ts` (naïve → UTC, Date locale ré-étiquetée UTC, offset explicite préservé, DateTime inchangé) — vérifié indépendant du TZ
