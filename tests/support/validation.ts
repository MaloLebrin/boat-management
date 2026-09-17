import type { Assert } from '@japa/assert'
import type { ApiResponse } from '@japa/api-client'

/**
 * Assertions sur les chemins d'erreur VineJS (#688).
 *
 * ## Pourquoi ne pas utiliser `response.assertHasValidationError()`
 *
 * `@adonisjs/session/plugins/api_client` expose bien cette macro, mais elle lit
 * le flash **`errors`** :
 *
 * ```js
 * ApiResponse.macro('assertHasValidationError', function (field) {
 *   this.assert.property(this.flashMessage('errors'), field)
 * })
 * ```
 *
 * Or le middleware de session d'AdonisJS v7 range les erreurs de validation
 * dans **`inputErrorsBag`** (`session-*.js` : `this.flash('inputErrorsBag', errorsBag)`),
 * et c'est ce sac-là que le middleware Inertia relit pour construire la prop
 * `errors` des pages (`inertia_middleware.js:12`). La macro du plugin échoue
 * donc systématiquement — vérifié : `assert.property(undefined, 'clientName')`.
 *
 * Asserter sur `inertiaErrors()` plutôt que sur la macro, c'est asserter
 * exactement le contrat que les formulaires Vue consomment.
 *
 * ## Deux familles d'échec, à ne pas confondre
 *
 * - **Contrainte de schéma** (VineJS) → `inputErrorsBag`, erreur rendue **sous
 *   le champ** : c'est ce que couvrent `assertFieldErrors` / `assertNoFieldErrors`.
 * - **Règle métier** (service : `endsAt <= startsAt`, immatriculation déjà
 *   prise, chevauchement…) → flash `error`, rendu en **toast**, sans champ
 *   associé : `assertBusinessRuleRejection`.
 *
 * L'issue #688 les listait ensemble ; elles n'ont ni le même point de contrôle
 * ni le même rendu, et un test qui confond les deux passerait au vert après un
 * déplacement de la règle d'une couche à l'autre.
 */

/** Le sac d'erreurs par champ, tel que la page Inertia le recevra. */
export function inertiaErrors(response: ApiResponse): Record<string, string[]> {
  return (response.flashMessage('inputErrorsBag') ?? {}) as Record<string, string[]>
}

/**
 * La requête a été refusée par le schéma, et **exactement** sur les champs
 * attendus.
 *
 * L'égalité stricte est délibérée : avec un simple « contient », un payload
 * cassé sur trois champs passerait le test écrit pour un seul, et on croirait
 * prouver une contrainte qu'on n'a jamais atteinte.
 */
export function assertFieldErrors(assert: Assert, response: ApiResponse, fields: string[]): void {
  response.assertStatus(302)
  assert.deepEqual(
    Object.keys(inertiaErrors(response)).sort(),
    [...fields].sort(),
    `erreurs de validation attendues sur ${fields.join(', ')}`
  )
}

/**
 * Aucune erreur de champ — l'assertion qui rend les précédentes non vacantes :
 * elle prouve que le payload de référence franchit bien le validateur, donc que
 * chaque refus vient de la seule mutation sous test.
 */
export function assertNoFieldErrors(assert: Assert, response: ApiResponse): void {
  assert.deepEqual(Object.keys(inertiaErrors(response)), [])
}

/**
 * Refus par une règle métier : pas d'erreur de champ, un flash `error`, et un
 * retour en arrière. Le message exact appartient à la couche i18n et n'est pas
 * figé ici — seul le fait qu'un message soit émis l'est.
 */
export function assertBusinessRuleRejection(assert: Assert, response: ApiResponse): void {
  response.assertStatus(302)
  assert.deepEqual(
    Object.keys(inertiaErrors(response)),
    [],
    'une règle métier ne remonte pas dans le sac des erreurs de champ'
  )
  assert.isString(
    response.flashMessage('error'),
    'une règle métier refusée doit produire un flash `error`'
  )
}
