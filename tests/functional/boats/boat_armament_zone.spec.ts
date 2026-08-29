import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type { SafetyComplianceReport } from '#shared/types/safety'

/**
 * Zone d'armement Division 240 et conformité (#582).
 *
 * La zone est le **programme de navigation déclaré** (distance d'un abri), pas
 * la catégorie de conception CE : les deux champs cohabitent sans se
 * contaminer, et une zone vide ne déclenche aucun contrôle.
 */
test.group('Boat armament zone (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('PUT enregistre une zone du vocabulaire', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: boat.name, armamentZone: 'coastal' })

    await boat.refresh()
    assert.equal(boat.armamentZone, 'coastal')
  })

  test('PUT refuse une zone hors vocabulaire', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      armamentZone: 'coastal',
    }).create()

    await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: boat.name, armamentZone: 'transatlantic' })

    await boat.refresh()
    assert.equal(boat.armamentZone, 'coastal', 'la zone ne doit pas avoir bougé')
  })

  test('PUT vide la zone quand le select est laissé vide', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      armamentZone: 'offshore',
    }).create()

    await client.put(`/boats/${boat.id}`).loginAs(user).form({ name: boat.name, armamentZone: '' })

    await boat.refresh()
    assert.isNull(boat.armamentZone)
  })

  test('la zone et la catégorie CE sont deux champs indépendants', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      navigationCategory: 'B',
    }).create()

    await client
      .put(`/boats/${boat.id}`)
      .loginAs(user)
      .form({ name: boat.name, navigationCategory: 'B', armamentZone: 'basic' })

    await boat.refresh()
    assert.equal(boat.navigationCategory, 'B')
    assert.equal(boat.armamentZone, 'basic')
  })

  test('la fiche bateau expose un rapport vide tant qu’aucune zone n’est déclarée', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatSafetyEquipment.create({
      boatId: boat.id,
      equipmentType: 'flare',
      quantity: 3,
      expiryDate: DateTime.now().minus({ years: 2 }),
      status: 'expired',
    })

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const { safetyCompliance: report } = response.inertiaProps as {
      safetyCompliance: SafetyComplianceReport
    }
    assert.isNull(report.zone)
    assert.isNull(report.score)
    assert.isEmpty(report.issues)
  })

  test('la fiche bateau expose les écarts dès qu’une zone est déclarée', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      armamentZone: 'coastal',
      maxPersons: 4,
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const { safetyCompliance: report } = response.inertiaProps as {
      safetyCompliance: SafetyComplianceReport
    }
    assert.equal(report.zone, 'coastal')
    assert.equal(report.score, 0)
    assert.isAbove(report.requirementCount, 0)

    const jackets = report.issues.find((issue) => issue.equipmentType === 'life_jacket')
    assert.exists(jackets)
    assert.equal(jackets!.kind, 'missing')
    assert.equal(jackets!.requiredQuantity, 4)
  })
})
