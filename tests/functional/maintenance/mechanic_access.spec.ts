import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'

test.group('Mechanic role — maintenance access (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('mechanic can create a maintenance event on any boat in the organization', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(mechanic).form({
      subject: 'engine',
      engineCaption: 'Moteur principal',
      title: 'Vidange moteur',
      performedAt: '2025-05-01',
    })

    const event = await BoatMaintenanceEvent.query()
      .where('boatId', boat.id)
      .where('title', 'Vidange moteur')
      .first()
    assert.isNotNull(event)
  })

  test('mechanic cannot delete a maintenance event (admin-only capability)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(admin).form({
      subject: 'engine',
      engineCaption: 'Moteur principal',
      title: 'À supprimer',
      performedAt: '2025-05-01',
    })
    const event = await BoatMaintenanceEvent.query().where('boatId', boat.id).firstOrFail()

    // Bouncer redirects form-submission methods (POST/PUT/PATCH/DELETE) back with
    // a flash error instead of a raw 403, to stay Inertia-friendly — cf. CLAUDE.md.
    const response = await client
      .delete(`/boats/${boat.id}/maintenance/${event.id}`)
      .loginAs(mechanic)
      .redirects(0)

    response.assertStatus(302)
    const stillThere = await BoatMaintenanceEvent.find(event.id)
    assert.isNotNull(stillThere)
  })

  test('mechanic cannot edit the boat itself (no boats.edit capability)', async ({ client }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client
      .put(`/boats/${boat.id}`)
      .loginAs(mechanic)
      .form({ name: 'Renamed by mechanic' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('mechanic cannot access client management (no clients capabilities)', async ({ client }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client
      .post('/clients')
      .loginAs(mechanic)
      .form({ firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' })
      .redirects(0)

    response.assertStatus(302)
  })
})
