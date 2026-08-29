import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import NavigationLogEntryService, {
  NavigationLogEntryNotEditableError,
  NavigationLogEntryNotFoundError,
  NavigationLogNotFoundError,
} from '#services/navigation_log_entry_service'
import { NavigationLogValidationError } from '#exceptions/navigation_log_errors'
import NavigationLogEntry from '#models/navigation_log_entry'
import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { NavigationLogEntryFactory } from '#database/factories/navigation_log_entry_factory'

test.group('NavigationLogEntryService', () => {
  // ── createForLog ──────────────────────────────────────────────────────────

  test('createForLog crée un point sur une sortie en cours', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogEntryService()

    const entry = await svc.createForLog(boat, log.id, {
      recordedAt: DateTime.now().minus({ minutes: 10 }).toISO(),
      latitude: 47.2735,
      longitude: -2.2137,
      gpsAccuracyM: 6.5,
      cogDeg: 210,
      sogKn: 5.4,
      sailConfig: '  GV 1 ris + solent  ',
      note: '  envoi du spi  ',
    })

    assert.isNumber(entry.id)
    assert.equal(entry.navigationLogId, log.id)
    assert.equal(entry.organizationId, log.organizationId)
    assert.equal(entry.latitude, '47.2735')
    assert.equal(entry.longitude, '-2.2137')
    assert.equal(entry.cogDeg, 210)
    assert.equal(entry.sogKn, '5.4')
    assert.equal(entry.sailConfig, 'GV 1 ris + solent')
    assert.equal(entry.note, 'envoi du spi')
  })

  test('createForLog accepte un point sans coordonnées (GPS refusé)', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogEntryService()

    const entry = await svc.createForLog(boat, log.id, {
      recordedAt: DateTime.now().toISO(),
      note: 'au mouillage',
    })

    assert.isNull(entry.latitude)
    assert.isNull(entry.longitude)
    assert.isNull(entry.cogDeg)
    assert.isNull(entry.sogKn)
  })

  test('createForLog refuse une latitude sans longitude', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogEntryService()

    await assert.rejects(
      () =>
        svc.createForLog(boat, log.id, {
          recordedAt: DateTime.now().toISO(),
          latitude: 47.27,
        }),
      NavigationLogValidationError
    )
  })

  test('createForLog throw NotFound pour une sortie d’un autre bateau', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const otherBoat = await BoatFactory.with('organization').create()
    const otherLog = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherBoat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogEntryService()

    await assert.rejects(
      () => svc.createForLog(boat, otherLog.id, { recordedAt: DateTime.now().toISO() }),
      NavigationLogNotFoundError
    )
  })

  test('createForLog refuse une sortie clôturée sans allowCompleted', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'completed',
    }).create()
    const svc = new NavigationLogEntryService()

    await assert.rejects(
      () => svc.createForLog(boat, log.id, { recordedAt: DateTime.now().toISO() }),
      NavigationLogEntryNotEditableError
    )
  })

  test('createForLog accepte une sortie clôturée avec allowCompleted (correction admin)', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'completed',
    }).create()
    const svc = new NavigationLogEntryService()

    const entry = await svc.createForLog(
      boat,
      log.id,
      { recordedAt: DateTime.now().toISO(), latitude: 47.27, longitude: -2.21 },
      { allowCompleted: true }
    )

    assert.isNumber(entry.id)
  })

  test('createForLog applique le tzOffsetMinutes au recordedAt naïf (#452)', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const svc = new NavigationLogEntryService()

    // Wall-clock 10:00 dans un navigateur UTC+2 (offset -120) → 08:00 UTC
    const entry = await svc.createForLog(boat, log.id, {
      recordedAt: '2024-06-01T10:00',
      tzOffsetMinutes: -120,
    })

    assert.equal(entry.recordedAt.toUTC().toISO(), '2024-06-01T08:00:00.000Z')
  })

  // ── listForLog ────────────────────────────────────────────────────────────

  test('listForLog trie les points chronologiquement', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const later = await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: log.organizationId,
      recordedAt: DateTime.now().minus({ minutes: 5 }),
    }).create()
    const earlier = await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: log.organizationId,
      recordedAt: DateTime.now().minus({ hours: 2 }),
    }).create()
    const svc = new NavigationLogEntryService()

    const entries = await svc.listForLog(log)

    assert.deepEqual(
      entries.map((e) => e.id),
      [earlier.id, later.id]
    )
  })

  // ── updateForLog ──────────────────────────────────────────────────────────

  test('updateForLog préserve les champs absents et efface les null explicites (#180)', async ({
    assert,
  }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const entry = await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: log.organizationId,
      sailConfig: 'GV haute',
      note: 'note initiale',
      cogDeg: 90,
    }).create()
    const svc = new NavigationLogEntryService()

    const updated = await svc.updateForLog(boat, log.id, entry.id, {
      note: null,
      cogDeg: 180,
    })

    assert.equal(updated.sailConfig, 'GV haute')
    assert.isNull(updated.note)
    assert.equal(updated.cogDeg, 180)
  })

  test('updateForLog throw EntryNotFound pour un point d’une autre sortie', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const otherLog = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'completed',
    }).create()
    const foreignEntry = await NavigationLogEntryFactory.merge({
      navigationLogId: otherLog.id,
      organizationId: log.organizationId,
    }).create()
    const svc = new NavigationLogEntryService()

    await assert.rejects(
      () => svc.updateForLog(boat, log.id, foreignEntry.id, { note: 'x' }),
      NavigationLogEntryNotFoundError
    )
  })

  // ── deleteForLog ──────────────────────────────────────────────────────────

  test('deleteForLog supprime un point d’une sortie en cours', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
    }).create()
    const entry = await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: log.organizationId,
    }).create()
    const svc = new NavigationLogEntryService()

    await svc.deleteForLog(boat, log.id, entry.id)

    assert.isNull(await NavigationLogEntry.find(entry.id))
  })

  test('deleteForLog refuse sur une sortie clôturée sans allowCompleted', async ({ assert }) => {
    const boat = await BoatFactory.with('organization').create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'completed',
    }).create()
    const entry = await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: log.organizationId,
    }).create()
    const svc = new NavigationLogEntryService()

    await assert.rejects(
      () => svc.deleteForLog(boat, log.id, entry.id),
      NavigationLogEntryNotEditableError
    )
  })
})
