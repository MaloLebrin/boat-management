import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiAssistantConversation from '#models/ai_assistant_conversation'
import AiService from '#services/ai_service'
import AuditLog from '#models/audit_log'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Client from '#models/client'
import NavigationLog from '#models/navigation_log'
import OrganizationModuleService from '#services/organization_module_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import type { AssistantPendingAction, AssistantTaskAction } from '#shared/types/assistant'

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

function proposal(boatId: number, overrides: Partial<AssistantTaskAction> = {}) {
  return {
    kind: 'create_task',
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
  } as AssistantTaskAction
}

async function makeConversationWithPending(
  user: { id: number; organizationId: number | null },
  pendingAction: AssistantPendingAction | null,
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

test.group('Assistant FleetAi actions — kinds de l’agent actionnable', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  function confirm(client: import('@japa/api-client').ApiClient, token: string, user: unknown) {
    return client
      .post(`/assistant/conversations/${token}/action/confirm`)
      .loginAs(user as never)
      .redirects(0)
  }

  test('add_engine_hours : compteur incrémenté, audit, carte action_done', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, {
      kind: 'add_engine_hours',
      boatId: boat.id,
      boatName: 'Mistral II',
      engineId: engine.id,
      engineLabel: 'Yamaha 4AS',
      incrementBy: 22,
      currentHours: engine.hours,
    })

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Engine hours added.')

    const refreshed = await BoatEngine.findOrFail(engine.id)
    assert.equal(refreshed.hours, (engine.hours ?? 0) + 22)

    assert.lengthOf(await AuditLog.query().where('action', 'engine.add_hours'), 1)
    await conversation.refresh()
    assert.isNull(conversation.pendingAction)
    const card = conversation.messages.at(-1)!.card
    assert.equal(card?.kind, 'action_done')
    if (card?.kind === 'action_done') assert.equal(card.actionKind, 'add_engine_hours')
  })

  test('log_fuel : plein créé et journalisé', async ({ assert, client }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, {
      kind: 'log_fuel',
      boatId: boat.id,
      boatName: 'Mistral II',
      fueledAt: '2026-09-07T10:00',
      quantityLiters: 80,
      pricePerLiter: 1.85,
      totalCost: null,
      boatEngineId: null,
      engineLabel: null,
      fuelType: 'diesel',
      supplier: 'Capitainerie',
      notes: null,
    })

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Refueling recorded.')

    const logs = await BoatFuelLog.query().where('boatId', boat.id)
    assert.lengthOf(logs, 1)
    assert.equal(Number(logs[0].quantityLiters), 80)
    assert.lengthOf(await AuditLog.query().where('action', 'fuel_log.create'), 1)
  })

  test('report_incident : incident créé au statut open', async ({ assert, client }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversationWithPending(user, {
      kind: 'report_incident',
      boatId: boat.id,
      boatName: 'Mistral II',
      occurredAt: '2026-09-06T16:30',
      tzOffsetMinutes: null,
      incidentType: 'grounding',
      location: 'Chenal du Fromveur',
      description: 'Talonnage léger à marée basse, coque à inspecter.',
    })

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Incident reported.')

    const incidents = await BoatIncident.query().where('boatId', boat.id)
    assert.lengthOf(incidents, 1)
    assert.equal(incidents[0].type, 'grounding')
    assert.equal(incidents[0].status, 'open')
    assert.lengthOf(await AuditLog.query().where('action', 'incident.create'), 1)
  })

  test('start_trip : sortie ouverte ; refusée si une sortie est déjà en cours', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const pending = {
      kind: 'start_trip',
      boatId: boat.id,
      boatName: 'Mistral II',
      departedAt: '2026-09-07T09:00',
      tzOffsetMinutes: null,
      departurePortName: 'Camaret',
      engineHoursStart: null,
      crewCount: 3,
      notes: null,
    } as const
    const conversation = await makeConversationWithPending(user, pending)

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Trip opened in the logbook.')

    const logs = await NavigationLog.query().where('boatId', boat.id)
    assert.lengthOf(logs, 1)
    assert.equal(logs[0].status, 'in_progress')

    // Une seconde proposition alors que la sortie est toujours en cours : le
    // service métier la rejette, la proposition reste affichée.
    const again = await makeConversationWithPending(user, pending, 'cafebabe0222')
    const conflict = await confirm(client, again.token, user)
    conflict.assertFlashMessage(
      'error',
      'This boat already has a trip in progress: close it before opening another one.'
    )
    assert.lengthOf(await NavigationLog.query().where('boatId', boat.id), 1)
    await again.refresh()
    assert.isNotNull(again.pendingAction)
  })

  test('close_trip : la sortie en cours est clôturée ; sans sortie, entité disparue', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    const log = await NavigationLog.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 5 }),
    })
    const conversation = await makeConversationWithPending(user, {
      kind: 'close_trip',
      boatId: boat.id,
      boatName: 'Mistral II',
      logId: log.id,
      departedAt: log.departedAt!.toISO()!,
      arrivedAt: DateTime.now().plus({ hours: 1 }).toISO()!,
      tzOffsetMinutes: null,
      arrivalPortName: 'Brest',
      distanceNm: 12,
      engineHoursEnd: 120,
      boatEngineId: engine.id,
      engineLabel: 'Yamaha 4AS',
      fuelConsumedLiters: null,
      notes: null,
    })

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Trip closed.')

    await log.refresh()
    assert.equal(log.status, 'completed')
    assert.equal(Number(log.engineHoursEnd), 120)
    assert.lengthOf(await AuditLog.query().where('action', 'navigation_log.close'), 1)

    // Plus aucune sortie en cours : la proposition suivante vise une entité disparue.
    const again = await makeConversationWithPending(
      user,
      {
        kind: 'close_trip',
        boatId: boat.id,
        boatName: 'Mistral II',
        logId: log.id,
        departedAt: log.departedAt!.toISO()!,
        arrivedAt: DateTime.now().plus({ hours: 2 }).toISO()!,
        tzOffsetMinutes: null,
        arrivalPortName: null,
        distanceNm: null,
        engineHoursEnd: null,
        boatEngineId: null,
        engineLabel: null,
        fuelConsumedLiters: null,
        notes: null,
      },
      'cafebabe0333'
    )
    const gone = await confirm(client, again.token, user)
    gone.assertFlashMessage('error', 'The item targeted by this proposal no longer exists.')
  })

  test("le décalage de fuseau de la proposition est appliqué à l'écriture", async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    // -120 = `Date#getTimezoneOffset()` d'un navigateur en UTC+2 : 09:00 chez
    // l'utilisateur doit être écrit 07:00 UTC, pas 09:00.
    const conversation = await makeConversationWithPending(user, {
      kind: 'start_trip',
      boatId: boat.id,
      boatName: 'Mistral II',
      departedAt: '2026-09-07T09:00',
      tzOffsetMinutes: -120,
      departurePortName: 'Camaret',
      engineHoursStart: null,
      crewCount: null,
      notes: null,
    })

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Trip opened in the logbook.')

    const logs = await NavigationLog.query().where('boatId', boat.id)
    assert.lengthOf(logs, 1)
    assert.equal(logs[0].departedAt!.toUTC().toFormat('yyyy-MM-dd HH:mm'), '2026-09-07 07:00')
  })

  test('close_trip ne clôture jamais une autre sortie que celle proposée', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const proposed = await NavigationLog.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ hours: 6 }),
    })
    const conversation = await makeConversationWithPending(user, {
      kind: 'close_trip',
      boatId: boat.id,
      boatName: 'Mistral II',
      logId: proposed.id,
      departedAt: proposed.departedAt!.toISO()!,
      arrivedAt: DateTime.now().toISO()!,
      tzOffsetMinutes: null,
      arrivalPortName: 'Brest',
      distanceNm: 12,
      engineHoursEnd: null,
      boatEngineId: null,
      engineLabel: null,
      fuelConsumedLiters: null,
      notes: null,
    })

    // La sortie proposée est clôturée ailleurs, une autre est ouverte : la
    // confirmation ne doit PAS lui appliquer les données de la carte.
    proposed.status = 'completed'
    proposed.arrivedAt = DateTime.now().minus({ hours: 1 })
    await proposed.save()
    const other = await NavigationLog.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      status: 'in_progress',
      departedAt: DateTime.now().minus({ minutes: 30 }),
    })

    const gone = await confirm(client, conversation.token, user)
    gone.assertFlashMessage('error', 'The item targeted by this proposal no longer exists.')

    await other.refresh()
    assert.equal(other.status, 'in_progress')
    assert.isNull(other.arrivalPortName)
  })

  test('create_client : créé avec le module CRM, refusé sans lui', async ({ assert, client }) => {
    const user = await createAdminUser()
    await new OrganizationModuleService().grantModule(user.organizationId!, 'crm_invoicing', {
      source: 'subscription',
    })
    const pending = {
      kind: 'create_client',
      firstName: 'Éric',
      lastName: 'Tabarly',
      email: 'eric@example.com',
      phone: null,
      notes: null,
    } as const
    const conversation = await makeConversationWithPending(user, pending)

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Client record created.')
    const clients = await Client.query().where('organizationId', user.organizationId!)
    assert.lengthOf(clients, 1)
    assert.equal(clients[0].lastName, 'Tabarly')
    assert.isNull(clients[0].gdprConsentAt)
    assert.lengthOf(await AuditLog.query().where('action', 'client.create'), 1)

    // Org au plan pro SANS module CRM : le flag est re-vérifié à l'exécution.
    const bare = await createAdminUser()
    const bareConversation = await makeConversationWithPending(bare, pending, 'cafebabe0444')
    const denied = await confirm(client, bareConversation.token, bare)
    denied.assertFlashMessage('error', 'Your role or plan no longer allows this action.')
    assert.lengthOf(await Client.query().where('organizationId', bare.organizationId!), 0)
  })

  test('set_part_stock : stock écrasé, autres champs préservés ; pièce disparue → erreur', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    const part = await BoatEnginePart.create({
      boatEngineId: engine.id,
      designation: 'Turbine de pompe',
      reference: 'IMP-42',
      stock: 3,
      minStockAlert: 1,
      supplier: 'SVB',
      notes: 'Modèle 2024',
    })
    const pending = {
      kind: 'set_part_stock',
      boatId: boat.id,
      boatName: 'Mistral II',
      engineId: engine.id,
      engineLabel: 'Yamaha 4AS',
      partId: part.id,
      designation: 'Turbine de pompe',
      reference: 'IMP-42',
      oldStock: 3,
      newStock: 8,
    } as const
    const conversation = await makeConversationWithPending(user, pending)

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Part stock updated.')

    await part.refresh()
    assert.equal(part.stock, 8)
    assert.equal(part.reference, 'IMP-42')
    assert.equal(part.supplier, 'SVB')
    assert.equal(part.notes, 'Modèle 2024')
    assert.lengthOf(await AuditLog.query().where('action', 'engine_part.set_stock'), 1)

    await part.delete()
    const again = await makeConversationWithPending(user, pending, 'cafebabe0555')
    const gone = await confirm(client, again.token, user)
    gone.assertFlashMessage('error', 'The item targeted by this proposal no longer exists.')
  })

  test('un blob pending_action legacy sans kind est confirmé comme une tâche', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    // Blob d'avant l'agent actionnable : la forme AssistantTaskProposal, sans `kind`.
    const { kind: droppedKind, ...legacy } = proposal(boat.id)
    void droppedKind
    const conversation = await makeConversationWithPending(
      user,
      legacy as unknown as AssistantPendingAction
    )

    const reloaded = await AiAssistantConversation.findByOrFail('token', conversation.token)
    assert.equal(reloaded.pendingAction?.kind, 'create_task')

    const response = await confirm(client, conversation.token, user)
    response.assertFlashMessage('success', 'Maintenance task created.')
    assert.lengthOf(await BoatMaintenanceTask.query().where('boatId', boat.id), 1)
  })

  test('un rôle sans la capability du kind ne peut pas confirmer (Bouncer)', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    const { boat, engine } = await makeBoat(admin.organizationId!)
    const owner = await createBoatOwnerUser(admin.organizationId!)
    const conversation = await makeConversationWithPending(owner, {
      kind: 'add_engine_hours',
      boatId: boat.id,
      boatName: 'Mistral II',
      engineId: engine.id,
      engineLabel: 'Yamaha 4AS',
      incrementBy: 10,
      currentHours: null,
    })

    const response = await confirm(client, conversation.token, owner)
    response.assertStatus(302)
    const refreshed = await BoatEngine.findOrFail(engine.id)
    assert.equal(refreshed.hours, engine.hours)
    await conversation.refresh()
    assert.isNotNull(conversation.pendingAction)
  })
})
