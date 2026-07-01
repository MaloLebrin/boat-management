import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatBudgetEntry from '#models/boat_budget_entry'

test.group('Budget Entries (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:id/budget/entries creates an entry for authorized user', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: 'Taxe de francisation',
        amount: '1250.00',
        date: '2024-03-15',
        category: 'documents',
        description: 'Taxe annuelle',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const entries = await BoatBudgetEntry.query().where('boat_id', boat.id)
    assert.lengthOf(entries, 1)
    assert.equal(entries[0].label, 'Taxe de francisation')
    assert.equal(entries[0].amount, '1250.00')
    assert.equal(entries[0].category, 'documents')
  })

  test('POST /boats/:id/budget/entries defaults category to other', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: 'Cotisation club',
        amount: '350.00',
        date: '2024-01-01',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const entries = await BoatBudgetEntry.query().where('boat_id', boat.id)
    assert.lengthOf(entries, 1)
    assert.equal(entries[0].category, 'other')
  })

  test('POST /boats/:id/budget/entries redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: 'Test',
        amount: '100.00',
        date: '2024-01-01',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /boats/:id/budget/entries redirects to /boats when boat not found', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/boats/999999/budget/entries')
      .form({
        label: 'Test',
        amount: '100.00',
        date: '2024-01-01',
      })
      .loginAs(user)

    response.assertRedirectsTo('/boats')
  })

  test('POST /boats/:id/budget/entries redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: 'Test',
        amount: '100.00',
        date: '2024-01-01',
      })
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const entries = await BoatBudgetEntry.query().where('boat_id', boat.id)
    assert.lengthOf(entries, 0)
  })

  test('POST /boats/:id/budget/entries accepts negative amounts (avoir/remboursement)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: 'Remboursement assurance',
        amount: '-350.00',
        date: '2024-06-01',
        category: 'other',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const entries = await BoatBudgetEntry.query().where('boat_id', boat.id)
    assert.lengthOf(entries, 1)
    assert.equal(Number.parseFloat(entries[0].amount), -350)
  })

  test('PATCH /boats/:id/budget/entries/:entryId accepts negative amounts', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const entry = await BoatBudgetEntryFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .patch(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .form({
        label: 'Avoir carburant',
        amount: '-75.50',
        date: '2024-06-15',
        category: 'fuel',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await BoatBudgetEntry.findOrFail(entry.id)
    assert.equal(Number.parseFloat(updated.amount), -75.5)
  })

  test('POST /boats/:id/budget/entries validates required fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/budget/entries`)
      .form({
        label: '',
        amount: '',
        date: '',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const entries = await BoatBudgetEntry.query().where('boat_id', boat.id)
    assert.lengthOf(entries, 0)
  })

  test('DELETE /boats/:id/budget/entries/:entryId deletes the entry', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const entry = await BoatBudgetEntry.create({
      boatId: boat.id,
      label: 'Test expense',
      amount: '500.00',
      date: DateTime.fromISO('2024-06-01'),
      category: 'other',
    })

    const response = await client
      .delete(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const deleted = await BoatBudgetEntry.find(entry.id)
    assert.isNull(deleted)
  })

  test('DELETE /boats/:id/budget/entries/:entryId redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const entry = await BoatBudgetEntry.create({
      boatId: boat.id,
      label: 'Test expense',
      amount: '500.00',
      date: DateTime.fromISO('2024-06-01'),
      category: 'other',
    })

    const response = await client
      .delete(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('DELETE /boats/:id/budget/entries/:entryId redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const entry = await BoatBudgetEntry.create({
      boatId: boat.id,
      label: 'Test expense',
      amount: '500.00',
      date: DateTime.fromISO('2024-06-01'),
      category: 'other',
    })

    const response = await client
      .delete(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const existing = await BoatBudgetEntry.find(entry.id)
    assert.isNotNull(existing)
  })

  test('PATCH /boats/:id/budget/entries/:entryId updates the entry', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const entry = await BoatBudgetEntryFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .patch(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .form({
        label: 'Updated label',
        amount: '999.50',
        date: '2024-07-01',
        category: 'fuel',
      })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await BoatBudgetEntry.findOrFail(entry.id)
    assert.equal(updated.label, 'Updated label')
    assert.equal(Number.parseFloat(updated.amount), 999.5)
    assert.equal(updated.category, 'fuel')
  })

  test('PATCH /boats/:id/budget/entries/:entryId redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const entry = await BoatBudgetEntryFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .patch(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .form({ label: 'X', amount: '10', date: '2024-01-01' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PATCH /boats/:id/budget/entries/:entryId redirects when boat belongs to another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const entry = await BoatBudgetEntryFactory.merge({ boatId: boat.id }).create()
    const originalLabel = entry.label

    const response = await client
      .patch(`/boats/${boat.id}/budget/entries/${entry.id}`)
      .form({ label: 'Hacked', amount: '1', date: '2024-01-01' })
      .loginAs(other)

    response.assertRedirectsTo('/boats')

    const unchanged = await BoatBudgetEntry.findOrFail(entry.id)
    assert.equal(unchanged.label, originalLabel)
  })
})
