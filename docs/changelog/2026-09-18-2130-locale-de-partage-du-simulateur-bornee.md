# 2026-09-18 — Simulateur : la locale d'un partage est bornée (#729)

`POST /simulator/share` est publique et non authentifiée. Son validateur déclarait `locale: vine.string().optional()` — aucune borne — contre une colonne `varchar(10)`. Une locale de onze caractères franchissait donc la validation et cassait à l'insertion, et une locale bidon plus courte (`zz-ZZ`) était stockée puis servie à une page qui type pourtant sa prop `locale: 'en' | 'fr'`.

- **Cause.** La borne du validateur et celle de la colonne ne parlaient pas de la même chose : la seconde était atteinte **après** la première, et remontait en erreur PostgreSQL brute (`value too long for type character varying(10)`) — donc un **HTTP 500** sur une route publique.
- **Correctif.** `app/validators/simulator_share.ts` : `locale: vine.enum(APP_LOCALES).optional()`, la paire de locales de l'app (`shared/helpers/locale_path.ts`). Une locale hors `'fr' | 'en'` est désormais refusée en erreur de validation, avant toute écriture — les deux symptômes tombent ensemble, et le type de la prop de page cesse de mentir.
- **Comportement.** Locale absente : inchangée, retombe sur `'fr'`. `'fr'` / `'en'` : inchangées. Toute autre valeur : `302` de retour avec une erreur de champ sur `locale`, zéro ligne écrite (au lieu d'un 500 ou d'un stockage silencieux).
- **Tests.** `simulator_share_creation.spec.ts` : les deux cas de caractérisation #729 passent de « 500 » et « stockée et servie » à deux refus de validation (`assertFieldErrors(assert, response, ['locale'])`), dans le groupe des refus du validateur.
- **Docs.** `docs/domain/simulator.md` : le constat #729 quitte « ce que le serveur ne fait pas » pour une section « ce que le serveur borne ».
