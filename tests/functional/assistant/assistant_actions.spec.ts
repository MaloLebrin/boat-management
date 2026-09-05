import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import AiAssistantConversation from '#models/ai_assistant_conversation'
import AiService from '#services/ai_service'
import AuditLog from '#models/audit_log'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import type { AssistantTaskProposal } from '#shared/types/assistant'

async function makeBoat(organizationId: number) {
  const boat = await BoatFactory.merge({ organizationId, name: 'Mistral II' }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '4AS',
  }).create()
  return { boat, engine }
}

function proposal(boatId: number, overrides: Partial<AssistantTaskProposal> = {}) {
  return {
    boatId,
    boatName: 'Mistral II',
    engineLabel: null,
    subject: 'engine',
    title: 'Oil change',
    notes: 'Before the season',
    boatEngineId: null,
    dueAt: '2026-09-06',
    dueEngineHours: null,
    recurrenceIntervalMonths: null,
    recurrenceIntervalEngineHours: null,
    ...overrides,
  } as AssistantTaskProposal
}

async function makeConversationWithPending(
  user: { id: number; organizationId: number | null },
  pendingAction: AssistantTaskProposal | null,
  token = 'cafebabe0100'
) {
  return AiAssistantConversation.create({
    token,
    userId: user.id,
    organizationId: user.organizationId,
    locale: 'en',
    status: 'active',
    messages: [
      { role: 'user', content: 'Schedule the oil change' },
      { role: 'assistant', content: 'I can schedule it for tomorrow.' },
    ],
    pendingAction,
    tokensUsed: 42,
  })
}

test.group('Assistant FleetAi actions (functional)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('confirm executes the stored proposal: task, audit log, card', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, proposal(boat.id))

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Maintenance task created.')

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id)
    assert.lengthOf(tasks, 1)
    assert.equal(tasks[0].title, 'Oil change')
    assert.equal(tasks[0].subject, 'engine')
    assert.equal(tasks[0].notes, 'Before the season')
    assert.equal(tasks[0].status, 'open')

    const logs = await AuditLog.query().where('action', 'maintenance_task.create')
    assert.lengthOf(logs, 1)
    assert.equal(logs[0].entityId, tasks[0].id)

    await conversation.refresh()
    assert.isNull(conversation.pendingAction)
    const last = conversation.messages.at(-1)!
    assert.equal(last.card?.kind, 'task_created')
    if (last.card?.kind === 'task_created') {
      assert.equal(last.card.taskId, tasks[0].id)
      assert.equal(last.card.boatName, 'Mistral II')
    }
  })

  test('an engine-hour proposal creates the hour-based task', async ({ assert, client }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(
      user,
      proposal(boat.id, {
        engineLabel: 'Yamaha 4AS',
        boatEngineId: engine.id,
        dueAt: null,
        dueEngineHours: 250,
        recurrenceIntervalEngineHours: 100,
      })
    )

    await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(user)
      .redirects(0)

    const tasks = await BoatMaintenanceTask.query().where('boatId', boat.id)
    const task = tasks[0]
    assert.equal(task.boatEngineId, engine.id)
    assert.equal(task.dueEngineHours, 250)
    assert.equal(task.recurrenceIntervalEngineHours, 100)
    assert.isNull(task.dueAt)
  })

  test('a role without maintenance.create cannot confirm', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const { boat } = await makeBoat(admin.organizationId!)
    const ownerUser = await createBoatOwnerUser(admin.organizationId!)
    const conversation = await makeConversationWithPending(ownerUser, proposal(boat.id))

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(ownerUser)
      .redirects(0)

    // Bouncer sur une soumission de formulaire : flash + redirect back (cf.
    // `app/exceptions/handler.ts`) — pas de page 403.
    response.assertStatus(302)
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
    await conversation.refresh()
    assert.isNotNull(conversation.pendingAction)
  })

  test('confirm without a pending proposal flashes and creates nothing', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, null)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'No proposal is awaiting confirmation.')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
  })

  test('a double confirm creates a single task', async ({ assert, client }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, proposal(boat.id))

    await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(user)
      .redirects(0)
    const second = await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(user)
      .redirects(0)

    second.assertFlashMessage('error', 'No proposal is awaiting confirmation.')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 1)
  })

  test('dismiss clears the proposal and appends the dismissed card', async ({ assert, client }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, proposal(boat.id))

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/action/dismiss`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    await conversation.refresh()
    assert.isNull(conversation.pendingAction)
    assert.equal(conversation.messages.at(-1)!.card?.kind, 'task_dismissed')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
  })

  test("another user's pending action cannot be confirmed", async ({ assert, client }) => {
    const owner = await createAdminUser()
    const { boat } = await makeBoat(owner.organizationId!)
    const conversation = await makeConversationWithPending(owner, proposal(boat.id))

    const other = await createAdminUser()

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/action/confirm`)
      .loginAs(other)
      .redirects(0)

    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 0)
  })
})
