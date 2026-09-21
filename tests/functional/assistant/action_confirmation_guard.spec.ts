import { test } from '@japa/runner'
import { randomBytes } from 'node:crypto'
import type { ApiClient } from '@japa/api-client'
import { truncateDb } from '#tests/utils/db'
import AiAssistantConversation from '#models/ai_assistant_conversation'
import type User from '#models/user'
import AuditLog from '#models/audit_log'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatFuelLog from '#models/boat_fuel_log'
import BoatIncident from '#models/boat_incident'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import NavigationLog from '#models/navigation_log'
import OrganizationModuleService from '#services/organization_module_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import {
  createBoatOwnerUser,
  createCharterAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'
import { ASSISTANT_ACTION_KINDS } from '#shared/types/assistant'
import type { AssistantActionKind, AssistantPendingAction } from '#shared/types/assistant'

/**
 * La frontière que le copilote franchit quand il écrit en base (#697).
 *
 * `assistant_actions.spec.ts` joue le **succès** de huit kinds sur neuf. Le
 * **refus** n'y était mesuré que pour deux d'entre eux, et `create_reservation`
 * — l'un des deux kinds gardés par un drapeau de plan, celui qui écrit une
 * réservation — n'était atteint par aucun test serveur.
 *
 * Trois choses sont éprouvées ici, et aucune ne l'était :
 *
 * 1. **les neuf kinds refusés**, chacun avec un témoin en base. Un refus sans
 *    témoin ne prouve rien : il ne distingue pas « le Bouncer a arrêté
 *    l'action » de « l'action a écrit puis la réponse a redirigé » ;
 * 2. **le contre-exemple** : le même décor, les mêmes propositions, un
 *    `mechanic` — `create_task` passe, les huit autres non. Sans lui, un refus
 *    global (route cassée, middleware trop large) passerait pour la règle ACL
 *    qu'on croit mesurer ;
 * 3. **la révocation entre la proposition et la confirmation**, que le
 *    commentaire de `ASSISTANT_ACTION_META` promet mot pour mot. Le cas existant
 *    de `create_client` compare deux organisations différentes ; il ne joue pas
 *    le changement de plan dans le dos d'une proposition déjà posée.
 *
 * ⚠️ La cohérence entre la capability annoncée par `ASSISTANT_ACTION_META` et la
 * policy réellement appelée par `authorizeConfirm` n'est **pas** observable
 * ici : ni `boat_owner` (aucune capability) ni `mechanic` (maintenance seule) ne
 * distinguent `boats.edit` de `boats.manage`. C'est
 * `tests/unit/hygiene/assistant_action_capabilities.spec.ts` qui la tient.
 */

const ACCESS_DENIED = 'Access denied'
const PLAN_DENIED = 'Your role or plan no longer allows this action.'
const NO_PROPOSAL = 'No proposal is awaiting confirmation.'

interface Decor {
  admin: Awaited<ReturnType<typeof createCharterAdminUser>>
  boatId: number
  engineId: number
  partId: number
  logId: number
}

/**
 * Un décor unique pour les neuf kinds : le bateau, son moteur, une pièce en
 * stock et une sortie **en cours** (`close_trip` la réclame). L'organisation
 * porte le module `charter`, sans quoi `create_reservation` serait refusé pour
 * une raison qui n'est pas celle qu'on mesure.
 */
async function decor(): Promise<Decor> {
  const admin = await createCharterAdminUser()
  const organizationId = admin.organizationId!
  const boat = await BoatFactory.merge({ organizationId, name: 'Mistral II' }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id, hours: 120 }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id, stock: 1 }).create()
  const log = await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId,
    status: 'in_progress',
  }).create()
  return { admin, boatId: boat.id, engineId: engine.id, partId: part.id, logId: log.id }
}

/** Une proposition valide par kind, dénormalisée comme le serveur la stocke. */
function pendingFor(kind: AssistantActionKind, d: Decor): AssistantPendingAction {
  const onBoat = { boatId: d.boatId, boatName: 'Mistral II' }
  switch (kind) {
    case 'create_task':
      return {
        kind,
        ...onBoat,
        engineLabel: null,
        subject: 'engine',
        title: 'Vidange',
        notes: null,
        boatEngineId: null,
        dueAt: '2026-10-01',
        dueEngineHours: null,
        recurrenceIntervalMonths: null,
        recurrenceIntervalEngineHours: null,
      }
    case 'add_engine_hours':
      return {
        kind,
        ...onBoat,
        engineId: d.engineId,
        engineLabel: 'Yamaha 4AS',
        incrementBy: 10,
        currentHours: 120,
      }
    case 'start_trip':
      return {
        kind,
        ...onBoat,
        departedAt: '2026-10-01T08:00',
        tzOffsetMinutes: 0,
        departurePortName: 'Marseille',
        engineHoursStart: null,
        crewCount: null,
        notes: null,
      }
    case 'close_trip':
      return {
        kind,
        ...onBoat,
        logId: d.logId,
        departedAt: '2026-10-01T08:00',
        arrivedAt: '2026-10-01T17:00',
        tzOffsetMinutes: 0,
        arrivalPortName: 'Cassis',
        distanceNm: 20,
        engineHoursEnd: null,
        boatEngineId: null,
        engineLabel: null,
        fuelConsumedLiters: null,
        notes: null,
      }
    case 'log_fuel':
      return {
        kind,
        ...onBoat,
        fueledAt: '2026-10-01',
        quantityLiters: 80,
        pricePerLiter: null,
        totalCost: null,
        boatEngineId: null,
        engineLabel: null,
        fuelType: null,
        supplier: null,
        notes: null,
      }
    case 'report_incident':
      return {
        kind,
        ...onBoat,
        occurredAt: '2026-10-01T10:00',
        tzOffsetMinutes: 0,
        incidentType: 'collision',
        location: null,
        description: 'Coque rayée au ponton',
        boatEngineId: null,
        engineLabel: null,
      }
    case 'create_reservation':
      return {
        kind,
        ...onBoat,
        startsAt: '2026-10-05T09:00',
        endsAt: '2026-10-06T18:00',
        tzOffsetMinutes: 0,
        clientId: null,
        clientName: 'Éric Tabarly',
        clientEmail: null,
        clientPhone: null,
        reservationType: null,
        notes: null,
      }
    case 'create_client':
      return {
        kind,
        firstName: 'Éric',
        lastName: 'Tabarly',
        email: 'eric@example.com',
        phone: null,
        notes: null,
      }
    case 'set_part_stock':
      return {
        kind,
        ...onBoat,
        engineId: d.engineId,
        engineLabel: 'Yamaha 4AS',
        partId: d.partId,
        designation: 'Filtre à huile',
        reference: null,
        oldStock: 1,
        newStock: 5,
      }
  }
}

/**
 * Le témoin : tout ce que les neuf kinds savent écrire, en un seul cliché. Un
 * refus doit le laisser **identique** — pas seulement laisser sa propre table
 * tranquille.
 */
async function ledger(d: Decor) {
  const engine = await BoatEngine.findOrFail(d.engineId)
  const part = await BoatEnginePart.findOrFail(d.partId)
  const log = await NavigationLog.findOrFail(d.logId)
  const [tasks, logs, fuelLogs, incidents, reservations, clients, audits] = await Promise.all([
    BoatMaintenanceTask.all(),
    NavigationLog.all(),
    BoatFuelLog.all(),
    BoatIncident.all(),
    BoatReservation.all(),
    Client.all(),
    AuditLog.all(),
  ])
  return {
    tasks: tasks.length,
    engineHours: Number(engine.hours),
    partStock: part.stock,
    navigationLogs: logs.length,
    proposedLogStatus: log.status,
    fuelLogs: fuelLogs.length,
    incidents: incidents.length,
    reservations: reservations.length,
    clients: clients.length,
    auditLogs: audits.length,
  }
}

async function propose(
  user: User,
  pendingAction: AssistantPendingAction
): Promise<AiAssistantConversation> {
  return AiAssistantConversation.create({
    token: randomBytes(6).toString('hex'),
    userId: user.id,
    organizationId: user.organizationId,
    locale: 'en',
    status: 'active',
    messages: [
      { role: 'user', content: 'Fais-le' },
      { role: 'assistant', content: 'Je te le propose.' },
    ],
    pendingAction,
    tokensUsed: 42,
  })
}

function confirm(client: ApiClient, token: string, user: User) {
  return client.post(`/assistant/conversations/${token}/action/confirm`).loginAs(user).redirects(0)
}

test.group('Copilote — les neuf kinds refusés à un rôle sans capability', (group) => {
  group.each.setup(() => truncateDb())

  for (const kind of ASSISTANT_ACTION_KINDS) {
    test(`${kind} : un boat_owner ne confirme pas, et rien ne bouge`, async ({
      client,
      assert,
    }) => {
      const d = await decor()
      const owner = await createBoatOwnerUser(d.admin.organizationId!)
      const conversation = await propose(owner, pendingFor(kind, d))
      const before = await ledger(d)

      const response = await confirm(client, conversation.token, owner)

      response.assertStatus(302)
      response.assertFlashMessage('error', ACCESS_DENIED)
      assert.deepEqual(await ledger(d), before, `${kind} a écrit malgré le refus`)

      // La proposition survit au refus : elle n'est pas consommée par une
      // tentative avortée — l'utilisateur la retrouve dans le fil.
      await conversation.refresh()
      assert.isNotNull(conversation.pendingAction)
    })
  }
})

test.group('Copilote — le contre-exemple : un mechanic passe là où il a la capability', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * `mechanic` ne porte que `maintenance.view/create/edit`. Il doit donc
   * confirmer `create_task` — et rien d'autre. Sans ce groupe, les neuf refus
   * ci-dessus seraient compatibles avec une route cassée.
   */

  test('create_task : le mechanic confirme et la tâche est créée', async ({ client, assert }) => {
    const d = await decor()
    const mechanic = await createMechanicUser(d.admin.organizationId!)
    const conversation = await propose(mechanic, pendingFor('create_task', d))

    const response = await confirm(client, conversation.token, mechanic)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Maintenance task created.')

    const tasks = await BoatMaintenanceTask.all()
    assert.lengthOf(tasks, 1)
    assert.equal(tasks[0].title, 'Vidange')
    assert.lengthOf(await AuditLog.query().where('action', 'maintenance_task.create'), 1)
  })

  const beyondMaintenance = ASSISTANT_ACTION_KINDS.filter((kind) => kind !== 'create_task')

  for (const kind of beyondMaintenance) {
    test(`${kind} : le mechanic est refusé, lui aussi`, async ({ client, assert }) => {
      const d = await decor()
      const mechanic = await createMechanicUser(d.admin.organizationId!)
      const conversation = await propose(mechanic, pendingFor(kind, d))
      const before = await ledger(d)

      const response = await confirm(client, conversation.token, mechanic)

      response.assertStatus(302)
      response.assertFlashMessage('error', ACCESS_DENIED)
      assert.deepEqual(await ledger(d), before, `${kind} a écrit pour un mechanic`)
    })
  }
})

test.group('Copilote — create_reservation, de la proposition à la ligne écrite', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin au module Location confirme : réservation, audit, carte', async ({
    client,
    assert,
  }) => {
    const d = await decor()
    const conversation = await propose(d.admin, pendingFor('create_reservation', d))

    const response = await confirm(client, conversation.token, d.admin)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Reservation created.')

    const reservations = await BoatReservation.all()
    assert.lengthOf(reservations, 1)
    assert.equal(reservations[0].boatId, d.boatId)
    assert.equal(reservations[0].clientName, 'Éric Tabarly')

    const audits = await AuditLog.query().where('action', 'reservation.create')
    assert.lengthOf(audits, 1)
    assert.equal(audits[0].entityId, reservations[0].id)

    // La carte remplace la proposition dans le fil : sans elle, l'écran
    // rouvrirait la même confirmation après un rechargement.
    await conversation.refresh()
    assert.isNull(conversation.pendingAction)
    const cards = conversation.messages.filter((message) => message.role === 'assistant')
    assert.isAbove(cards.length, 1, 'aucune carte n’a été ajoutée au fil')
  })

  test('le module révoqué après la proposition fait tomber la confirmation', async ({
    client,
    assert,
  }) => {
    // Le scénario que `ASSISTANT_ACTION_META` décrit en commentaire : le plan
    // peut changer entre la proposition et la confirmation. Le cas existant de
    // `create_client` compare deux organisations ; celui-ci révoque vraiment.
    const d = await decor()
    const conversation = await propose(d.admin, pendingFor('create_reservation', d))

    await new OrganizationModuleService().revokeModule(d.admin.organizationId!, 'charter', {
      source: 'subscription',
    })

    const response = await confirm(client, conversation.token, d.admin)

    response.assertStatus(302)
    response.assertFlashMessage('error', PLAN_DENIED)
    assert.lengthOf(await BoatReservation.all(), 0, 'une réservation a survécu à la révocation')
    assert.lengthOf(await AuditLog.query().where('action', 'reservation.create'), 0)

    // Refusée n'est pas rejetée : la proposition reste, l'utilisateur peut
    // réactiver le module et confirmer.
    await conversation.refresh()
    assert.isNotNull(conversation.pendingAction)
  })

  test('create_client : même révocation, même refus', async ({ client, assert }) => {
    const d = await decor()
    const modules = new OrganizationModuleService()
    await modules.grantModule(d.admin.organizationId!, 'crm_invoicing', { source: 'subscription' })
    const conversation = await propose(d.admin, pendingFor('create_client', d))

    await modules.revokeModule(d.admin.organizationId!, 'crm_invoicing', { source: 'subscription' })

    const response = await confirm(client, conversation.token, d.admin)

    response.assertStatus(302)
    response.assertFlashMessage('error', PLAN_DENIED)
    assert.lengthOf(await Client.all(), 0, 'un client a survécu à la révocation')
  })

  test('le drapeau de plan est re-vérifié APRÈS le Bouncer, pas à sa place', async ({
    client,
    assert,
  }) => {
    // La distinction compte : un rôle sans capability et un plan sans module
    // rendent deux messages différents, et un seul des deux est réparable par
    // l'utilisateur lui-même. Les confondre renverrait un admin vers son
    // administrateur.
    const d = await decor()
    const owner = await createBoatOwnerUser(d.admin.organizationId!)
    const ownerConversation = await propose(owner, pendingFor('create_reservation', d))
    const adminConversation = await propose(d.admin, pendingFor('create_reservation', d))

    await new OrganizationModuleService().revokeModule(d.admin.organizationId!, 'charter', {
      source: 'subscription',
    })

    const refusedByRole = await confirm(client, ownerConversation.token, owner)
    const refusedByPlan = await confirm(client, adminConversation.token, d.admin)

    refusedByRole.assertFlashMessage('error', ACCESS_DENIED)
    refusedByPlan.assertFlashMessage('error', PLAN_DENIED)
    assert.lengthOf(await BoatReservation.all(), 0)
  })
})

test.group('Copilote — une proposition écartée ne se rattrape pas', (group) => {
  group.each.setup(() => truncateDb())

  test('dismiss puis confirm : aucune écriture, message explicite', async ({ client, assert }) => {
    const d = await decor()
    const conversation = await propose(d.admin, pendingFor('add_engine_hours', d))
    const before = await ledger(d)

    await client
      .post(`/assistant/conversations/${conversation.token}/action/dismiss`)
      .loginAs(d.admin)
      .redirects(0)

    const response = await confirm(client, conversation.token, d.admin)

    response.assertStatus(302)
    response.assertFlashMessage('error', NO_PROPOSAL)
    assert.deepEqual(await ledger(d), before, 'une proposition écartée a tout de même écrit')
  })
})
