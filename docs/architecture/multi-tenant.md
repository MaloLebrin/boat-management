# Cloisonnement multi-tenant

L'application est multi-tenant. Le cloisonnement est **applicatif** : une requête qui oublie `organizationId` peut lire une autre organisation. Ce document fixe le contrat et dit pourquoi ni un global scope Lucid ni la RLS PostgreSQL ne sont activés.

## Contrat

Toute requête sur une entité passe par son **agrégat racine scopé organisation**.

- Racines : bateau, port, client, facture, membre d'équipage, saison tarifaire, export, invitation… Elles portent `organization_id` et les services filtrent avec l'organisation de l'utilisateur.
- Enfants (moteur, voile, tâche, plein, média, place via son port…) : on les charge **après** avoir résolu la racine dans l'organisation. `BoatEngine.find(params.engineId)` seul est interdit.
- `OrgScopedPolicy.before()` refuse une ressource dont l'`organizationId` (ou celui du `boat` / `port` préchargé) n'est pas celui de l'utilisateur. Ce n'est pas un filtre de requête : un service qui ne charge pas la ressource ne passe pas par la policy.

Le filet qui rend le contrat exécutable est `tests/functional/security/cross_org_routes.spec.ts` (#855). Il parcourt les routes authentifiées du routeur, appelle chacune avec les ids d'une autre organisation, et échoue sur un 200 ou sur un corps qui contient les données de cette organisation. Une route nouvelle à paramètre d'entité doit être sondée par la fixture, ou inscrite dans `EXCLUSIONS` avec une raison revue en PR.

Les fuites **intra**-organisation (capability, téléchargement) et l'intégrité référentielle de `media` sont hors de ce contrat.

## Colonne dénormalisée

Les pleins et les incidents portent déjà `organization_id`. La migration `1874000000000` l'ajoute, indexée, sur :

| Table                     | Nullabilité | Reprise                                                                                                                  |
| ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `boat_maintenance_events` | NOT NULL    | `boats.organization_id`                                                                                                  |
| `boat_maintenance_tasks`  | NOT NULL    | `boats.organization_id`                                                                                                  |
| `media`                   | nullable    | entité pointée (`entity_type`, `entity_id`) ; reste nul si l'entité n'a pas d'organisation (avatar d'un compte sans org) |

Les services d'écriture renseignent la colonne. Un hook `beforeCreate` la recopie depuis le bateau pour les fabriques et les seeders. `createMany` (import CSV) la pose explicitement : ce chemin n'exécute pas le hook.

La colonne permet un filtre direct et prépare une RLS. Les lectures passent toujours par l'agrégat racine — la colonne n'est pas encore le filtre de chaque requête.

## RLS : pas maintenant

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` avec `organization_id = current_setting('app.organization_id')::int` fermerait la faille même si un service oublie le `where`. On ne l'active pas :

- Lucid n'ouvre pas une transaction par requête. `SET LOCAL` ne vit que le temps d'une transaction : il faudrait envelopper **chaque** requête HTTP, et chaque job de queue, dans une transaction qui pose le réglage avant le premier `SELECT`.
- Les seeders, les commandes Ace, le webhook Stripe et les jobs sans utilisateur n'ont pas d'organisation courante. Une policy RLS sans exception les renverrait vides, ou exigerait un rôle `BYPASSRLS` à maintenir.
- `media.organization_id` est nullable, et une trentaine de tables enfants n'ont pas la colonne. Une RLS partielle donnerait un faux sentiment de couverture.
- Le coût de revue (toutes les requêtes, les tests, les deux bases) est disproportionné tant que le filet de routes n'a pas montré de fuite.

On y reviendra quand `organization_id` sera posé sur les enfants qui restent, et qu'un middleware pourra ouvrir la transaction de requête sans casser les jobs. D'ici là, le test cross-org est la barrière structurelle : une route ajoutée sans filtre fait échouer la suite.
