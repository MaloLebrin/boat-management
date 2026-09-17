# Isolation entre organisations au niveau des policies, et couverture de l'ACL

**Date :** 18 septembre 2026
**Issue :** #690 (épic #686)

## Ce qui change en production

`OrgScopedPolicy.before()` refuse désormais un admin sur une ressource appartenant à une **autre
organisation**.

Bouncer transmet l'action et ses arguments à ce hook — `before(user, action, ...args)` — et un
retour booléen **court-circuite entièrement** la méthode de policy. L'ancienne signature ne lisait
que `user` :

```ts
async before(user: User) {
  if (user.organizationId && (await user.isAdminOf(user.organizationId))) return true
}
```

Un admin de l'organisation B franchissait donc `bouncer.with(PortPolicy).authorize('edit', portDeA)` :
`sameOrg` n'était jamais atteint. Le refus ne venait que du scoping des services en aval
(`PortService.assertPortInUserOrg`), et le trou était invisible aux tests, qui appellent les
policies en direct — un chemin d'appel qui n'existe pas en production, puisqu'il saute `before()`.

### La règle retenue : refuser seulement sur une ressource prouvablement étrangère

Le hook lit l'organisation d'une ressource sous deux formes : la colonne `organizationId`
directe, et la relation `port` chargée (`Mouillage`, `Pontoon` et `Spot` n'ont pas de colonne
propre, ils héritent celle de leur port). Quand elle n'est **pas lisible** — argument absent,
payload de validation, relation non préchargée — l'admin passe comme avant.

Cette asymétrie est délibérée. Refuser sur le doute ferait retomber l'admin sur la méthode de
policy, qui refuserait par exemple un `Mouillage` dont le `port` n'est pas préchargé : un 403 tout
neuf sur un chemin aujourd'hui autorisé, pour un durcissement que personne n'a demandé.

Aucun effet sur les chemins déjà scopés en amont : dans les contrôleurs de ports, le service lève
`PortNotFoundError` **avant** que la policy ne soit consultée.

## Couverture ajoutée

- **19 specs unit de policy** (`tests/unit/policies/`) — il n'y en avait qu'un. Chaque action est
  vérifiée sur quatre axes : la capability exigée, son refus sans elle, l'isolation entre
  organisations, et le compte sans organisation. Les rôles `admin`, `member`, `mechanic` et
  `boat_owner` sont adossés au vrai `ROLE_PERMISSIONS`, jamais à des listes recopiées.
- **1 spec integration du hook `before()`** (`tests/integration/permissions/policy_before_hook.spec.ts`)
  — le seul fichier du dépôt qui passe par un vrai `Bouncer`, donc le seul qui teste ce que la
  production exécute vraiment.
- **5 specs unit de middleware** : `require_ports_plan`, `guest`, `silent_auth`, `auth`,
  `large_multipart_upload`.
- **Une garde d'exhaustivité** (`tests/unit/hygiene/policies_covered.spec.ts`) : toute policy a son
  spec, toute action publique y est nommée, tout spec correspond à une policy existante. Elle
  relit le disque plutôt que d'importer une liste du code testé, sinon elle hériterait de ses
  angles morts.

## Fabriques partagées

- `tests/support/policy_user.ts` — faux utilisateurs adossés à `ROLE_PERMISSIONS`. Une policy ne
  touche jamais la base : ses modèles sont importés en `import type`, donc un littéral suffit et
  les specs tiennent dans la suite `unit`.
- `tests/support/policy_matrix.ts` — l'exécuteur de la matrice commune. Les 19 policies posent la
  même question sous des noms différents ; l'écrire 19 fois produirait ~1 900 lignes de copies, et
  c'est dans les copies qu'un cas finit par manquer sans que ça se voie. Les particularités
  (arguments optionnels, règle métier, résolution via une relation) restent écrites en clair dans
  leur spec.
- `tests/support/http_context.ts` — faux `HttpContext`, extrait de
  `require_module_plan_middleware.spec.ts` où il vivait en local ; ce spec est migré dessus.

## Volontairement non couverts

`initialize_bouncer_middleware` et `container_bindings_middleware` n'ont aucune logique propre :
un test unitaire n'y ré-assérterait que le câblage du framework.

Le streaming réel de `large_multipart_upload_middleware` (écriture disque, `pipeline`) reste
couvert par `tests/functional/boats/boat_equipment_photos.spec.ts` ; le spec unit ne fixe que la
garde `bodyType`/`state` et la limite transmise.

La redirection vers `/login` n'est pas écrite dans `auth_middleware` — `authenticateUsing` lève,
et le handler d'exceptions traduit. Le spec unit vérifie donc ce qui appartient au middleware (les
arguments transmis, l'absence d'appel à la suite quand l'authentification échoue), et le dit.
