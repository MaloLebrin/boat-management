# Rôle d'organisation mémoïsé par requête

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 1.1.

## Problème

`User#getRoleInOrg` relisait `organization_memberships` à **chaque** appel. Or une
requête HTTP hydrate un seul `User` (`auth.user`) que se partagent le middleware
Inertia (`PermissionService.sharedProps`), le `before()` de `OrgScopedPolicy`
(`isAdminOf`) et chaque `can()` de policy (`hasPermission`). Mesuré sur
`GET /boats/:id` avec le nouveau compteur de requêtes : **11 SELECT** identiques
pour un admin, **21** pour un membre.

## Changement

- `app/models/user.ts` : cache `Map<orgId, { role, generation }>` privé sur
  l'instance. `getRoleInOrg`, et donc `isAdminOf`, `getEffectiveRoleInOrg` et
  `hasPermission`, ne font plus qu'une requête par organisation et par instance.
  `forgetRoles()` vide le cache à la main.
- `app/models/organization_membership.ts` : compteur statique `generation`
  incrémenté par les hooks `afterSave` / `afterDelete` (et `invalidateRoles()`
  pour une future écriture en masse qui contournerait les hooks). Une entrée de
  cache lue avant une écriture d'adhésion est ignorée : changer, créer ou
  supprimer une adhésion se voit immédiatement, même sur une instance déjà en
  vie (le test « changing the membership role flips the result » reste vert
  sans modification).
- Portée : une instance = une requête HTTP (ou un job). Aucune API publique ne
  change, aucun appelant n'est modifié.

## Tests

- `tests/utils/query_counter.ts` : `countQueries(run, { table })` écoute
  l'événement `query` de knex (émis sans `debug`, relayé par les transactions,
  donc utilisable sous la transaction globale de la suite integration).
- `tests/integration/models/user_role_cache.spec.ts` (9 tests, rouges avant) :
  une seule requête pour des checks répétés, absence d'adhésion mise en cache,
  une entrée par organisation, pas de partage entre instances, invalidation sur
  `save` / `delete` / `create`, `forgetRoles()`.
- `tests/functional/boats/boat_show_queries.spec.ts` : `GET /boats/:id` lit
  l'adhésion **au plus une fois**, pour un admin comme pour un membre (rouge
  avant : 11 et 21).
- Suites `permissions/*`, `mvp_org_boats_permissions` et backend complète
  inchangées.
