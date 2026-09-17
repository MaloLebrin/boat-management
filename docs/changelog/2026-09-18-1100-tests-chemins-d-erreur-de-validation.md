# 2026-09-18 — Tests : les chemins d'erreur de validation (#688)

Les 49 validateurs VineJS n'étaient exercés que sur leur chemin passant :
`grep -rE "assertSessionHasErrors|assertStatus\(422\)" tests/functional` rendait **0**. Élargir un
`vine.enum`, relever un `maxLength` ou rendre optionnel un champ requis ne faisait échouer aucun
test, alors que `tests/inertia/form_errors.spec.ts` sait déjà afficher des erreurs que rien ne
garantissait que le backend émette encore.

- **L'assertion attendue n'existe pas.** `response.assertHasValidationError()`, exposée par
  `@adonisjs/session/plugins/api_client`, lit le flash **`errors`**
  (`this.assert.property(this.flashMessage('errors'), field)`). Or le middleware de session
  d'AdonisJS v7 range les erreurs de validation dans **`inputErrorsBag`**, et c'est ce sac-là que
  le middleware Inertia relit pour construire la prop `errors` des pages
  (`inertia_middleware.js:12`). La macro échoue donc systématiquement, avec un
  `assert.property(undefined, …)` — vérifié avant d'écrire quoi que ce soit.
- **Une fabrique unique.** `tests/support/validation.ts` : `assertFieldErrors`,
  `assertNoFieldErrors`, `assertBusinessRuleRejection`, toutes adossées à `inputErrorsBag`. Un seul
  endroit à corriger si le framework renomme le sac, et des assertions qui portent exactement sur
  le contrat que les formulaires Vue consomment.
- **Deux familles d'échec, séparées.** Une **contrainte de schéma** (VineJS) remonte dans
  `inputErrorsBag` et s'affiche sous le champ. Une **règle métier** (`endsAt <= startsAt`,
  immatriculation déjà prise, heures moteur décroissantes) est levée par le service, remonte en
  flash `error` et s'affiche en toast, sans champ associé. L'issue #688 les listait ensemble ;
  elles n'ont ni le même point de contrôle ni le même rendu, et un test qui les confond passerait
  au vert après un déplacement de la règle d'une couche à l'autre.
- **Ce que l'issue annonçait et qui n'existe pas.** L'unicité de l'immatriculation n'est pas dans
  le validateur : c'est l'index `(organization_id, registration_number)` de la table `boats`,
  rattrapé en 23505. Et une certification d'équipage ne porte pas de date de délivrance — la
  cohérence « expiration avant délivrance » n'a rien à comparer. Les deux cas sont testés pour ce
  qu'ils sont, pas pour ce qu'on croyait.
- **Tests.** 7 specs, 66 cas, dans les répertoires existants : `boats_validation` (12),
  `reservations_validation` (11), `navigation_logs_validation` (13), `invoices_validation` (11),
  `clients_validation` (7), `crew_validation` (7), `ports_validation` (5).
- **Non-vacuité.** Chaque fichier ouvre sur un **témoin** : le payload de référence franchit le
  validateur et crée l'enregistrement. Chaque cas suivant n'en change qu'un champ, et
  `assertFieldErrors` exige l'**égalité stricte** du jeu de champs fautifs — un payload cassé sur
  trois champs ne peut pas passer pour la preuve d'une contrainte qu'on n'a jamais atteinte.
  Vérifié par mutation : élargir `navigationCategories` à `'E'`, abaisser le `minLength` du nom de
  port et retirer `range([0, 100])` de `taxRate` fait tomber exactement les quatre tests
  correspondants.
