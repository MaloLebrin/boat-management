import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogEntryFactory } from '#database/factories/navigation_log_entry_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import NavigationLogEntry from '#models/navigation_log_entry'
import { createAdminUser } from '#tests/functional/helpers'
import { UPDATE_NAVIGATION_LOG_ENTRY_ACTION } from '#shared/constants/offline_queue'

/**
 * Le verrou optimiste de l'édition d'un point de journal (#725).
 *
 * C'était la **seule** des quatre mutations enfilées hors-ligne à n'en avoir
 * aucun : pas de `_expectedUpdatedAt` envoyé, aucune détection côté service.
 * Et c'est l'écran où ça compte le plus — un point se saisit en mer, là où il
 * n'y a pas de réseau. Deux équipiers qui corrigent le même point pendant la
 * sortie : au retour, le dernier rejeu écrasait l'autre sans rien afficher.
 */

/** Un horodatage qu'aucune ligne ne peut porter : le conflit est garanti. */
const STALE = '2000-01-01T00:00:00.000+00:00'

async function seedEntry() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const log = await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId: user.organizationId!,
    status: 'in_progress',
  }).create()
  const entry = await NavigationLogEntryFactory.merge({
    navigationLogId: log.id,
    organizationId: user.organizationId!,
    note: 'version du serveur',
  }).create()

  return { user, boat, log, entry }
}

test.group('Point de journal — le verrou optimiste', (group) => {
  group.each.setup(() => truncateDb())

  test('un `_expectedUpdatedAt` périmé rend un conflit sans rien écrire', async ({
    client,
    assert,
  }) => {
    const { user, boat, log, entry } = await seedEntry()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)
      .form({ note: 'écrasement', _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('conflictType', UPDATE_NAVIGATION_LOG_ENTRY_ACTION)
    response.assertFlashMessage('conflictData')

    const reloaded = await NavigationLogEntry.findOrFail(entry.id)
    assert.equal(reloaded.note, 'version du serveur', 'la version du serveur a été écrasée')
  })

  test('un `_expectedUpdatedAt` à jour écrit normalement', async ({ client, assert }) => {
    // Le contre-exemple indispensable : sans lui, un verrou qui refuserait
    // **tout** passerait pour une détection de conflit.
    const { user, boat, log, entry } = await seedEntry()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)
      .form({ note: 'correction légitime', _expectedUpdatedAt: entry.updatedAt!.toISO() })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('conflictType')
    const reloaded = await NavigationLogEntry.findOrFail(entry.id)
    assert.equal(reloaded.note, 'correction légitime')
  })

  test('sans `_expectedUpdatedAt`, l’édition reste possible', async ({ client, assert }) => {
    // Le champ est optionnel : une édition en ligne depuis un écran qui ne
    // l'envoie pas ne doit pas se mettre à échouer.
    const { user, boat, log, entry } = await seedEntry()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)
      .form({ note: 'sans verrou' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('conflictType')
    const reloaded = await NavigationLogEntry.findOrFail(entry.id)
    assert.equal(reloaded.note, 'sans verrou')
  })

  test('le conflit gagne sur le refus métier : rien n’est écrit deux fois', async ({
    client,
    assert,
  }) => {
    // Un point modifié entre-temps **et** une valeur hors bornes : c'est le
    // conflit qui doit remonter, puisqu'il est évalué avant toute écriture.
    const { user, boat, log, entry } = await seedEntry()

    const response = await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)
      .form({ note: 'écrasement', _expectedUpdatedAt: STALE })
      .redirects(0)

    response.assertFlashMessage('conflictType', UPDATE_NAVIGATION_LOG_ENTRY_ACTION)
    const reloaded = await NavigationLogEntry.findOrFail(entry.id)
    assert.equal(reloaded.updatedAt!.toISO(), entry.updatedAt!.toISO(), 'la ligne a été touchée')
  })
})
