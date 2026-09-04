import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogEntryFactory } from '#database/factories/navigation_log_entry_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import NavigationLogEntry from '#models/navigation_log_entry'
import { createAdminUser, createMemberUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { truncateDb } from '#tests/utils/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Navigation log entries (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // ─── store ───────────────────────────────────────────────────────────────

  test('POST store creates a log entry on an in-progress trip', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'in_progress',
    }).create()

    await client.post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`).loginAs(user).form({
      recordedAt: '2024-06-01T10:00',
      latitude: 47.2735,
      longitude: -2.2137,
      cogDeg: 210,
      sogKn: 5.4,
      sailConfig: 'GV + solent',
      note: 'envoi du spi',
    })

    const entry = await NavigationLogEntry.query().where('navigationLogId', log.id).first()
    assert.isNotNull(entry)
    assert.equal(entry!.cogDeg, 210)
    assert.equal(entry!.sailConfig, 'GV + solent')
  })

  test('POST store rejects an entry on another boat trip', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    const otherLog = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherUser.organizationId!,
      status: 'in_progress',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${otherLog.id}/entries`)
      .loginAs(user)
      .form({ recordedAt: '2024-06-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    const count = await NavigationLogEntry.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST store rejects a completed trip for a plain member', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'completed',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`)
      .loginAs(member)
      .form({ recordedAt: '2024-06-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    const count = await NavigationLogEntry.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST store allows an admin to correct a completed trip', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'completed',
    }).create()

    await client.post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`).loginAs(admin).form({
      recordedAt: '2024-06-01T18:00',
      latitude: 47.2604,
      longitude: -2.3399,
      note: 'position corrigée : retour au ponton',
    })

    const entry = await NavigationLogEntry.query().where('navigationLogId', log.id).first()
    assert.isNotNull(entry)
  })

  test('POST store rejects out-of-range coordinates', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'in_progress',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`)
      .loginAs(user)
      .form({ recordedAt: '2024-06-01T10:00', latitude: 123, longitude: 0, cogDeg: 400 })
      .redirects(0)

    response.assertStatus(302)
    const count = await NavigationLogEntry.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('POST store denies a read-only boat owner', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'in_progress',
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs/${log.id}/entries`)
      .loginAs(owner)
      .form({ recordedAt: '2024-06-01T10:00' })
      .redirects(0)

    response.assertStatus(302)
    const count = await NavigationLogEntry.query().count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  // ─── update / destroy ────────────────────────────────────────────────────

  test('PATCH update edits an entry', async ({ client, assert }) => {
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
    }).create()

    await client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)
      .form({ note: 'corrigé', cogDeg: 180 })

    await entry.refresh()
    assert.equal(entry.note, 'corrigé')
    assert.equal(entry.cogDeg, 180)
  })

  test('DELETE destroy removes an entry', async ({ client, assert }) => {
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
    }).create()

    await client
      .delete(`/boats/${boat.id}/navigation-logs/${log.id}/entries/${entry.id}`)
      .loginAs(user)

    assert.isNull(await NavigationLogEntry.find(entry.id))
  })

  // ─── show ────────────────────────────────────────────────────────────────

  test('GET show renders the trip detail page with its entries', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'in_progress',
    }).create()
    await NavigationLogEntryFactory.merge({
      navigationLogId: log.id,
      organizationId: user.organizationId!,
      recordedAt: DateTime.now().minus({ minutes: 30 }),
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${log.id}`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/navigation_log_show')
  })

  test('GET show redirects when the trip belongs to another boat', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const otherLog = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${otherLog.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=navigation-logs`)
  })
})
