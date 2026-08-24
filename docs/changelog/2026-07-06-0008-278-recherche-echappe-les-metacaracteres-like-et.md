# 2026-07-06 — [#278] Recherche : échappe les métacaractères LIKE (`%` et `_`)

Les services de recherche interpolaient la saisie utilisateur dans un motif `whereILike('...', \`%${q}%\`)`sans échapper les métacaractères LIKE. Conséquence :`q = '%'`renvoyait **toutes** les lignes de l'org (motif`%%%`) et `q = '\_'` matchait tout enregistrement d'au moins un caractère — contrat de recherche cassé.

- **Helper partagé** : `shared/helpers/query.ts` → `escapeLike(input)` échappe `\`, `%` et `_` (PostgreSQL utilise `\` comme caractère d'échappement par défaut, pas de clause `ESCAPE` nécessaire).
- **Appliqué** à `app/services/client_service.ts` (recherche `first_name`/`last_name`/`email`) et `app/services/boat_list_service.ts` (recherche `name`/`registration_number`).
- **Tests** : unitaires `tests/unit/helpers/query.spec.ts` (échappement de `%`, `_`, `\`) + fonctionnels `tests/functional/search/like_escaping.spec.ts` (`q='%'` ne renvoie que les lignes contenant littéralement `%` ; `q='A_B'` ne matche pas `AXB`).
