# 2026-09-18 — Les cinq routes de la ressource bateau résolvent par `BoatContextService`

**Date** : 2026-09-18 — reste annoncé par le changelog du service de contexte
bateau (« les résolutions inline de `boats_controller.ts` […] à traiter avec
`BoatContextService` quand ces contrôleurs seront revus »).

## Problème

`boats_controller.ts` était le dernier contrôleur bateau à résoudre le sien à
la main. Seize autres passaient déjà par `BoatContextService` ; ici, cinq
méthodes recopiaient l'appel, et quatre d'entre elles le même
`catch (BoatNotFoundError)` redirigeant vers `/boats`.

La caractérisation a trouvé mieux qu'une redondance : **`PUT /boats/:id`
répondait 500** sur un bateau invisible. Sa résolution était la seule posée
hors du `try`, l'erreur partait donc au handler global — et
`BoatNotFoundError` est une `Error` nue, sans statut, donc une page 500. Les
quatre autres routes redirigeaient. Le bateau était bien protégé, mais par un
plantage.

## Correctif

- Les cinq méthodes (`show`, `edit`, `update`, `destroy`, `assign`) appellent
  `this.boatContext.resolveBoat({ auth, response, params }, 'id')` puis
  `if (!resolved) return`.
- **`resolveBoatDetail`** est ajouté au service pour `show` : la profondeur de
  chargement (`getFullDetailForUser`, avec ses relations de fiche) était la
  seule chose qui l'y distinguait des autres routes.
- Le service factorise sa redirection dans un `orRedirectToList(load, response)`
  privé — les deux méthodes ne diffèrent plus que par le chargeur passé.
- `boats_controller.ts` perd ses quatre `catch (BoatNotFoundError)` et son
  import de l'erreur ; `assign` garde le sien pour `SpotNotFoundError`,
  `update` pour `SpotNotFoundError` et `RegistrationNumberTakenError`.

## Comportement changé (un seul)

`PUT /boats/:id` sur un bateau inexistant ou étranger **redirige vers `/boats`**
au lieu de renvoyer 500. Les quatre autres routes sont inchangées, et aucune
n'expose plus ni moins de données qu'avant.

## Tests

- `tests/functional/boats/boat_not_found_redirect.spec.ts` (nouveau, 6 tests) :
  les cinq routes sur un bateau d'une autre organisation, plus un utilisateur
  sans organisation. Committé d'abord en figeant le 500 constaté, puis retourné
  par le correctif — le diff montre les deux états.
- Shard `functional-boats` : 560 tests verts. `unit`+`integration` : 916.
  `functional-core` : 460. `functional-other` : 405.
