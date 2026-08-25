import { test } from '@japa/runner'
import AiAnalysis from '#models/ai_analysis'
import { AiAnalysisFactory } from '#database/factories/ai_analysis_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import app from '@adonisjs/core/services/app'
import AiAnalysisService from '#services/ai_analysis_service'
import AiService, { type AiChatMessage } from '#services/ai_service'
import type { BoatSuggestionsInput, FleetAnalysisInput } from '#shared/types/ai'
import { DateTime } from 'luxon'

test.group('AiAnalysisService — organization scoping', () => {
  test('getLatestFleetAnalysis returns null when org has no analyses', async ({ assert }) => {
    const orgA = await OrganizationFactory.create()
    const orgB = await OrganizationFactory.create()
    const userA = await UserFactory.merge({ organizationId: orgA.id }).create()
    const userB = await UserFactory.merge({ organizationId: orgB.id }).create()

    await AiAnalysisFactory.merge({
      userId: userA.id,
      organizationId: orgA.id,
      kind: 'fleet_analysis',
    }).create()

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestFleetAnalysis(userB.id, orgB.id, 'fr')
    assert.isNull(result)
  })

  test('getLatestFleetAnalysis does not leak across orgs', async ({ assert }) => {
    const orgA = await OrganizationFactory.create()
    const orgB = await OrganizationFactory.create()
    const userA = await UserFactory.merge({ organizationId: orgA.id }).create()

    await AiAnalysisFactory.merge({
      userId: userA.id,
      organizationId: orgA.id,
      kind: 'fleet_analysis',
      responseText: JSON.stringify([{ text: 'Org A analysis' }]),
    }).create()

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestFleetAnalysis(userA.id, orgB.id, 'fr')
    assert.isNull(result)
  })

  test('getLatestFleetAnalysis returns the most recent for the correct org', async ({ assert }) => {
    const orgA = await OrganizationFactory.create()
    const userA = await UserFactory.merge({ organizationId: orgA.id }).create()

    const older = await AiAnalysisFactory.merge({
      userId: userA.id,
      organizationId: orgA.id,
      kind: 'fleet_analysis',
      responseText: JSON.stringify([{ text: 'Older' }]),
      createdAt: DateTime.now().minus({ hours: 2 }),
    }).create()

    const newer = await AiAnalysisFactory.merge({
      userId: userA.id,
      organizationId: orgA.id,
      kind: 'fleet_analysis',
      responseText: JSON.stringify([{ text: 'Newer' }]),
      createdAt: DateTime.now().minus({ hours: 1 }),
    }).create()

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestFleetAnalysis(userA.id, orgA.id, 'fr')
    assert.isNotNull(result)
    assert.equal(result!.id, newer.id)
    assert.notEqual(result!.id, older.id)
  })

  test('getLatestBoatSuggestions does not leak across orgs', async ({ assert }) => {
    const orgA = await OrganizationFactory.create()
    const orgB = await OrganizationFactory.create()
    const userA = await UserFactory.merge({ organizationId: orgA.id }).create()
    const boat = await BoatFactory.merge({ organizationId: orgA.id }).create()

    await AiAnalysis.create({
      userId: userA.id,
      organizationId: orgA.id,
      boatId: boat.id,
      kind: 'boat_suggestions',
      locale: 'fr',
      responseText: JSON.stringify([{ text: 'Org A boat suggestion' }]),
      createdAt: DateTime.now(),
    })

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestBoatSuggestions(userA.id, boat.id, orgB.id, 'fr')
    assert.isNull(result)
  })

  test('getLatestBoatSuggestions returns result for correct org', async ({ assert }) => {
    const orgA = await OrganizationFactory.create()
    const userA = await UserFactory.merge({ organizationId: orgA.id }).create()
    const boat = await BoatFactory.merge({ organizationId: orgA.id }).create()

    const created = await AiAnalysis.create({
      userId: userA.id,
      organizationId: orgA.id,
      boatId: boat.id,
      kind: 'boat_suggestions',
      locale: 'fr',
      responseText: JSON.stringify([{ text: 'suggestion' }]),
      createdAt: DateTime.now(),
    })

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestBoatSuggestions(userA.id, boat.id, orgA.id, 'fr')
    assert.isNotNull(result)
    assert.equal(result!.id, created.id)
  })
})

test.group('AiAnalysisService — locale scoping (#460)', () => {
  test('getLatestFleetAnalysis ignores an analysis generated in another locale', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    await AiAnalysisFactory.merge({
      userId: user.id,
      organizationId: org.id,
      kind: 'fleet_analysis',
      locale: 'fr',
      responseText: JSON.stringify([{ text: 'Vidanger le moteur du Sun Odyssey 35' }]),
    }).create()

    const svc = await app.container.make(AiAnalysisService)

    assert.isNull(await svc.getLatestFleetAnalysis(user.id, org.id, 'en'))
    assert.isNotNull(await svc.getLatestFleetAnalysis(user.id, org.id, 'fr'))
  })

  test('getLatestFleetAnalysis returns the latest analysis of the requested locale', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    const french = await AiAnalysisFactory.merge({
      userId: user.id,
      organizationId: org.id,
      kind: 'fleet_analysis',
      locale: 'fr',
      createdAt: DateTime.now().minus({ hours: 1 }),
    }).create()

    // Plus récente, mais dans l'autre langue : elle ne doit pas primer.
    await AiAnalysisFactory.merge({
      userId: user.id,
      organizationId: org.id,
      kind: 'fleet_analysis',
      locale: 'en',
      createdAt: DateTime.now(),
    }).create()

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestFleetAnalysis(user.id, org.id, 'fr')

    assert.isNotNull(result)
    assert.equal(result!.id, french.id)
  })

  test('getLatestBoatSuggestions ignores suggestions generated in another locale', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()

    await AiAnalysis.create({
      userId: user.id,
      organizationId: org.id,
      boatId: boat.id,
      kind: 'boat_suggestions',
      locale: 'en',
      responseText: JSON.stringify([{ text: 'Check the antifouling' }]),
      createdAt: DateTime.now(),
    })

    const svc = await app.container.make(AiAnalysisService)

    assert.isNull(await svc.getLatestBoatSuggestions(user.id, boat.id, org.id, 'fr'))
    assert.isNotNull(await svc.getLatestBoatSuggestions(user.id, boat.id, org.id, 'en'))
  })
})

const FLEET_INPUT: FleetAnalysisInput = {
  boats: [
    {
      name: 'Sun Odyssey 35',
      propulsionType: 'sail',
      enginesCount: 1,
      sailsCount: 2,
      hasRig: true,
    },
  ],
  urgentMaintenance: [
    {
      boatName: 'Sun Odyssey 35',
      title: 'Engine oil change',
      kind: 'date',
      dueAt: '2026-07-01',
      dueEngineHours: null,
      currentEngineHours: null,
    },
  ],
  stats: { boats: 1, engines: 1, sails: 2, rigs: 1, urgentMaintenance: 1 },
}

const BOAT_INPUT: BoatSuggestionsInput = {
  boat: {
    id: 1,
    name: 'Sun Odyssey 35',
    type: 'sailboat',
    propulsionType: 'sail',
    yearBuilt: 2010,
    manufacturer: 'Jeanneau',
    model: 'Sun Odyssey 35',
    homePort: 'La Rochelle',
    navigationCategory: 'A',
    engines: [],
    sails: [],
    rig: null,
    safetyEquipment: [],
  },
  maintenanceTasks: [],
  maintenanceEvents: [],
}

// Pas de `truncate()` ici : la suite `integration` enveloppe chaque test dans une
// transaction globale (cf. `tests/bootstrap.ts`) et un TRUNCATE l'attendrait
// indéfiniment. Chaque test crée ses propres org/user/bateau et ne requête que
// les siens.
test.group('AiAnalysisService — generation honours the caller locale (#460)', (group) => {
  let capturedMessages: AiChatMessage[] = []

  group.each.setup(() => {
    capturedMessages = []
    app.container.swap(
      AiService,
      () =>
        ({
          chat: async (messages: AiChatMessage[]) => {
            capturedMessages = messages
            return { content: '[{"text":"A suggestion"}]', tokensUsed: 42 }
          },
        }) as unknown as AiService
    )

    return () => app.container.restore(AiService)
  })

  test('generateFleetAnalysis prompts in English and stamps the analysis with "en"', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(AiAnalysisService)
    await svc.generateFleetAnalysis(user.id, org, FLEET_INPUT, 'en')

    const system = capturedMessages.find((m) => m.role === 'system')!.content
    const userMessage = capturedMessages.find((m) => m.role === 'user')!.content

    assert.include(system, 'Write every suggestion in English')
    assert.notInclude(system, 'Tu es un expert en maintenance marine')
    assert.include(userMessage, 'Analyze this fleet of boats')
    assert.notInclude(userMessage, 'Analyse cette flotte')

    const stored = await AiAnalysis.query().where('userId', user.id).firstOrFail()
    assert.equal(stored.locale, 'en')
  })

  test('generateFleetAnalysis keeps the French prompt for a French user', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(AiAnalysisService)
    await svc.generateFleetAnalysis(user.id, org, FLEET_INPUT, 'fr')

    const system = capturedMessages.find((m) => m.role === 'system')!.content
    const userMessage = capturedMessages.find((m) => m.role === 'user')!.content

    assert.include(system, 'Tu es un expert en maintenance marine')
    assert.include(userMessage, 'Analyse cette flotte de bateaux')

    const stored = await AiAnalysis.query().where('userId', user.id).firstOrFail()
    assert.equal(stored.locale, 'fr')
  })

  test('generateBoatSuggestions prompts in English and stamps the analysis with "en"', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(AiAnalysisService)
    await svc.generateBoatSuggestions(user.id, boat.id, org, BOAT_INPUT, 'en')

    const userMessage = capturedMessages.find((m) => m.role === 'user')!.content
    assert.include(userMessage, 'Analyze this boat')
    assert.include(userMessage, 'Home port:')

    const stored = await AiAnalysis.query().where('boatId', boat.id).firstOrFail()
    assert.equal(stored.locale, 'en')
  })

  test('an org custom system prompt is prefixed to the localized one', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(AiAnalysisService)
    await svc.generateFleetAnalysis(user.id, org, FLEET_INPUT, 'en', 'Focus on safety equipment.')

    const system = capturedMessages.find((m) => m.role === 'system')!.content
    assert.isTrue(system.startsWith('Focus on safety equipment.'))
    assert.include(system, 'Write every suggestion in English')
  })
})
