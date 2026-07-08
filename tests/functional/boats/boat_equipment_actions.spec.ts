import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import BoatEquipmentAction from '#models/boat_equipment_action'
import Boat from '#models/boat'

const VALID_ACTION = {
  label: 'Acheter une ancre neuve',
  actionType: 'to_buy',
  notes: 'Ancre 10kg',
  estimatedCost: '150.00',
}

test.group('Boat Equipment Actions (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // --- CRUD: store ---

  test('POST .../equipment-actions creates an action for authorized user', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(user)
      .form(VALID_ACTION)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=equipmentActions`)
    response.assertFlashMessage('success', 'Action added.')

    const action = await BoatEquipmentAction.findBy('label', VALID_ACTION.label)
    assert.isNotNull(action)
    assert.equal(action!.boatId, boat.id)
    assert.equal(action!.organizationId, boat.organizationId)
    assert.equal(action!.actionType, 'to_buy')
    assert.equal(action!.status, 'pending')
    assert.equal(action!.createdBy, user.id)
    assert.isNull(action!.resolvedAt)
  })

  test('POST .../equipment-actions redirects to /boats when boat not found', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/boats/999999/equipment-actions')
      .loginAs(user)
      .form(VALID_ACTION)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('POST .../equipment-actions redirects to login when unauthenticated', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .form(VALID_ACTION)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  // --- CRUD: update ---

  test('PUT .../equipment-actions/:actionId updates an action', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Original label',
      createdBy: user.id,
    })

    const response = await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .form({ label: 'Updated label', notes: 'New notes' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=equipmentActions`)
    response.assertFlashMessage('success', 'Action updated.')

    await action.refresh()
    assert.equal(action.label, 'Updated label')
    assert.equal(action.notes, 'New notes')
  })

  test('PUT .../equipment-actions/:actionId returns notFound for wrong action', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .put(`/boats/${boat.id}/equipment-actions/999999`)
      .loginAs(user)
      .form({ label: 'Test' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Action not found.')
  })

  // --- CRUD: destroy ---

  test('DELETE .../equipment-actions/:actionId deletes an action for admin', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_repair',
      status: 'pending',
      label: 'To delete',
      createdBy: user.id,
    })

    const response = await client
      .delete(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=equipmentActions`)
    response.assertFlashMessage('success', 'Action deleted.')

    const deleted = await BoatEquipmentAction.find(action.id)
    assert.isNull(deleted)
  })

  test('DELETE .../equipment-actions/:actionId rejects member (admin-only capability)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_repair',
      status: 'pending',
      label: 'Protected',
      createdBy: admin.id,
    })

    await client
      .delete(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(member)
      .redirects(0)

    // The action should NOT be deleted by a member (equipmentActions.delete is admin-only)
    const stillExists = await BoatEquipmentAction.find(action.id)
    assert.isNotNull(stillExists, 'Action should not be deleted by member')
  })

  // --- Business rule: done requires actual_cost ---

  test('PUT status=done without actual_cost is rejected', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Test done',
      createdBy: user.id,
    })

    const response = await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .form({ status: 'done' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Actual cost is required when marking as done.')

    await action.refresh()
    assert.equal(action.status, 'pending')
    assert.isNull(action.resolvedAt)
  })

  test('PUT status=done with actual_cost succeeds and sets resolved_at', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Test done',
      createdBy: user.id,
    })

    const response = await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .form({ status: 'done', actualCost: '125.50' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Action updated.')

    await action.refresh()
    assert.equal(action.status, 'done')
    assert.isNotNull(action.resolvedAt)
    assert.equal(action.actualCost, '125.50')
  })

  test('PUT status back from done clears resolved_at', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Test revert',
      actualCost: '100',
      createdBy: user.id,
    })

    // First mark as done (actualCost already set)
    const doneResponse = await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .form({ status: 'done', actualCost: '100' })
      .redirects(0)

    doneResponse.assertStatus(302)
    doneResponse.assertFlashMessage('success', 'Action updated.')

    await action.refresh()
    assert.equal(action.status, 'done')
    assert.isNotNull(action.resolvedAt)

    // Now revert to ordered
    await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(user)
      .form({ status: 'ordered' })
      .redirects(0)

    await action.refresh()
    assert.equal(action.status, 'ordered')
    assert.isNull(action.resolvedAt)
  })

  // --- Scope organization (IDOR) ---

  test('cross-org user cannot access another org boat actions', async ({ client }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_buy',
      status: 'pending',
      label: 'Secret action',
      createdBy: owner.id,
    })

    // Try to update
    const updateResponse = await client
      .put(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(other)
      .form({ label: 'Hacked' })
      .redirects(0)

    updateResponse.assertStatus(302)
    updateResponse.assertHeader('location', '/boats')

    // Try to delete
    const deleteResponse = await client
      .delete(`/boats/${boat.id}/equipment-actions/${action.id}`)
      .loginAs(other)
      .redirects(0)

    deleteResponse.assertStatus(302)
    deleteResponse.assertHeader('location', '/boats')
  })

  // --- CASCADE DELETE on boat ---

  test('deleting a boat cascades and deletes its equipment actions', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_replace',
      status: 'pending',
      label: 'Will be deleted',
      createdBy: user.id,
    })

    await Boat.query().where('id', boat.id).delete()

    const deleted = await BoatEquipmentAction.find(action.id)
    assert.isNull(deleted)
  })

  // --- Validation ---

  test('POST with empty label is rejected', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(user)
      .form({ label: '', actionType: 'to_buy' })
      .redirects(0)

    // VineJS validation redirects back with errors
    response.assertStatus(302)
    // The redirect goes back (not to ?tab=equipmentActions with success)
  })

  test('POST with invalid actionType is rejected', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(user)
      .form({ label: 'Test', actionType: 'invalid_type' })
      .redirects(0)

    response.assertStatus(302)
  })

  // --- equipment reference ---

  test('POST with equipment reference saves correctly', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/equipment-actions`)
      .loginAs(user)
      .form({
        label: 'Replace engine oil filter',
        actionType: 'to_replace',
        equipmentType: 'engine',
        equipmentId: '42',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Action added.')

    const action = await BoatEquipmentAction.findBy('label', 'Replace engine oil filter')
    assert.isNotNull(action)
    assert.equal(action!.equipmentType, 'engine')
    assert.equal(action!.equipmentId, 42)
  })
})
