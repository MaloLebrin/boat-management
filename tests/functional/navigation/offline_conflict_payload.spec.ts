import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceSheetFactory } from '#database/factories/boat_maintenance_sheet_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'
import type { ApiResponse } from '@japa/api-client'
import type { Assert } from '@japa/assert'

/**
 * Ouvrir `conflictData`, au lieu de constater sa présence (#696).
 *
 * Les specs existantes assertent `response.assertFlashMessage('conflictData')`
 * — la clé est là. Le front, lui, en fait tout autre chose :
 *
 * ```ts
 * const serverData = JSON.parse(flash.conflictData as string)
 * ```
 *
 * puis `ConflictResolutionModal.vue` y lit les champs listés par
 * `FIELDS_BY_TYPE`, un par type de conflit, pour les mettre en regard de la
 * version locale. Rien ne vérifiait que le JSON émis porte ces champs-là : une
 * colonne renommée, un transformer glissé entre le service et le flash, et la
 * modale s'ouvre en demandant de trancher entre deux colonnes vides — tous les
 * tests au vert.
 *
 * Les cartes de champs sont recopiées ici **à la main**, depuis le composant.
 * C'est volontaire : les importer depuis un fichier partagé ferait de ce test
 * une tautologie. Leur cohérence est tenue séparément par
 * `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts`.
 */

/** `FIELDS_BY_TYPE['update-navigation-log']` de `ConflictResolutionModal.vue`. */
const UPDATE_LOG_FIELDS = ['windForceBeaufort', 'seaState', 'crewCount', 'notes']

/** `FIELDS_BY_TYPE['close-navigation-log']`. */
const CLOSE_LOG_FIELDS = [
  'arrivedAt',
  'arrivalPortName',
  'distanceNm',
  'engineHoursEnd',
  'fuelConsumedLiters',
  'windForceBeaufort',
  'seaState',
  'crewCount',
  'notes',
]

/** `FIELDS_BY_TYPE['update-sheet-item']`. */
const SHEET_ITEM_FIELDS = ['isDone', 'notes']

const STALE = '2000-01-01T00:00:00.000+00:00'

/**
 * Ce que `drainQueue` fait du flash : un `JSON.parse`. Le faire ici plutôt que
 * d'asserter la présence de la clé est tout l'objet de ce fichier — un objet
 * flashé au lieu d'une chaîne passerait `assertFlashMessage` et jetterait en
 * production.
 */
function parseConflictData(response: ApiResponse): Record<string, unknown> {
  const raw = (response.flashMessages() as Record<string, unknown>)['conflictData']

  if (typeof raw !== 'string') {
    throw new TypeError(
      `conflictData doit être une chaîne JSON (drainQueue fait JSON.parse dessus), reçu ${typeof raw}`
    )
  }

  return JSON.parse(raw) as Record<string, unknown>
}

function assertShowsFields(
  assert: Assert,
  data: Record<string, unknown>,
  fields: string[],
  type: string
) {
  const missing = fields.filter((field) => !(field in data))

  assert.deepEqual(
    missing,
    [],
    `champs absents du conflictData de « ${type} » : ${missing.join(', ')} — ` +
      `la modale de conflit afficherait des lignes vides pour eux`
  )
}

test.group('Conflit hors-ligne — la charge utile de la sortie', (group) => {
  group.each.setup(() => truncateDb())

  test('« update-navigation-log » porte les champs que la modale compare', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      windForceBeaufort: 3,
      seaState: 'slight',
      crewCount: 4,
      notes: 'version du serveur',
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .form({ windForceBeaufort: 7, _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertFlashMessage('conflictType', 'update-navigation-log')
    const data = parseConflictData(response)

    assertShowsFields(assert, data, UPDATE_LOG_FIELDS, 'update-navigation-log')

    // Et ce sont bien les valeurs **du serveur** : c'est ce que l'utilisateur
    // choisit de garder ou d'écraser. Renvoyer la version locale rendrait la
    // modale absurde — deux colonnes identiques.
    assert.equal(data.windForceBeaufort, 3)
    assert.equal(data.seaState, 'slight')
    assert.equal(data.crewCount, 4)
    assert.equal(data.notes, 'version du serveur')
  })

  test('« close-navigation-log » porte les neuf champs de sa clôture', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2024-01-01T08:00:00'),
      notes: 'version du serveur',
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .loginAs(user)
      .form({ arrivedAt: '2024-01-01T14:00', _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertFlashMessage('conflictType', 'close-navigation-log')
    const data = parseConflictData(response)

    // La carte de clôture est la plus large des quatre : c'est celle qui casse
    // le plus discrètement si le modèle sérialisé maigrit.
    assertShowsFields(assert, data, CLOSE_LOG_FIELDS, 'close-navigation-log')
    assert.equal(data.notes, 'version du serveur')
  })

  test('« update-sheet-item » porte les deux champs de sa ligne', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sheet = await BoatMaintenanceSheetFactory.merge({
      boatId: boat.id,
      status: 'in_progress',
      type: 'entretien',
    }).create()
    const item = await BoatMaintenanceSheetItem.create({
      boatMaintenanceSheetId: sheet.id,
      position: 1,
      label: 'Vidange',
      isDone: false,
      notes: 'version du serveur',
    })

    const response = await client
      .put(`/boats/${boat.id}/maintenance-sheets/${sheet.id}/items/${item.id}`)
      .loginAs(user)
      .form({ isDone: true, notes: 'rejeu hors-ligne', _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertFlashMessage('conflictType', 'update-sheet-item')
    const data = parseConflictData(response)

    assertShowsFields(assert, data, SHEET_ITEM_FIELDS, 'update-sheet-item')
    assert.equal(data.isDone, false)
    assert.equal(data.notes, 'version du serveur')
  })

  test('la charge utile est toujours une chaîne, jamais un objet', async ({ client, assert }) => {
    // `drainQueue` appelle `JSON.parse` sans filet. Flasher l'objet directement
    // — ce que la session accepte — ferait jeter le front au retour du réseau,
    // au pire moment : la file est en train de se vider.
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .form({ windForceBeaufort: 7, _expectedUpdatedAt: STALE })
      .redirects(0)

    assert.isString((response.flashMessages() as Record<string, unknown>)['conflictData'])
  })
})
