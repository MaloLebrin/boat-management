import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiAnalysis from '#models/ai_analysis'
import AiTokenUsage from '#models/ai_token_usage'
import Notification from '#models/notification'
import OrganizationMembership from '#models/organization_membership'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import AiProactiveSuggestionService from '#services/ai_proactive_suggestion_service'
import AiService, { type AiChatMessage } from '#services/ai_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'

/**
 * Fixture standard : org `pro` + admin (locale fr) + bateau + moteur.
 * Chaque test crée son propre lot (suite `integration` = transaction globale,
 * jamais de truncate — cf. tests/bootstrap.ts).
 */
async function createProOrgWithBoat(locale = 'fr') {
  const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
  const admin = await UserFactory.merge({ organizationId: org.id, locale }).create()
  await OrganizationMembership.create({ userId: admin.id, organizationId: org.id, role: 'admin' })
  const boat = await BoatFactory.merge({ organizationId: org.id }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    fuel: 'essence',
    hours: 480,
  }).create()
  return { org, admin, boat, engine }
}

function orgAnalyses(orgId: number) {
  return AiAnalysis.query().where('organizationId', orgId)
}

/** Antidate toutes les analyses de l'org au-delà de la cadence de 7 jours. */
async function backdateAnalyses(orgId: number) {
  await AiAnalysis.query()
    .where('organizationId', orgId)
    .update({ createdAt: DateTime.now().minus({ days: 8 }).toSQL() })
}

test.group('AiProactiveSuggestionService — scheduled generation', (group) => {
  let chatCalls = 0

  group.each.setup(() => {
    chatCalls = 0
    app.container.swap(
      AiService,
      () =>
        ({
          chat: async (_messages: AiChatMessage[]) => {
            chatCalls++
            return { content: '[{"text":"Suggestion planifiée"}]', tokensUsed: 42 }
          },
        }) as unknown as AiService
    )

    return () => app.container.restore(AiService)
  })

  test('a first run creates org-owned analyses (userId NULL) for boat and engine, and notifies admins', async ({
    assert,
  }) => {
    const { org, admin, boat, engine } = await createProOrgWithBoat()

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()

    const boatAnalysis = await orgAnalyses(org.id)
      .where('kind', 'boat_suggestions')
      .where('boatId', boat.id)
      .firstOrFail()
    assert.isNull(boatAnalysis.userId)
    assert.equal(boatAnalysis.locale, 'fr')
    assert.match(boatAnalysis.contextHash ?? '', /^[0-9a-f]{64}$/)

    const engineAnalysis = await orgAnalyses(org.id)
      .where('kind', 'engine_suggestions')
      .where('boatEngineId', engine.id)
      .firstOrFail()
    assert.isNull(engineAnalysis.userId)
    assert.equal(engineAnalysis.boatId, boat.id)

    const notifications = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'ai.suggestions_ready')
    assert.lengthOf(notifications, 1)
    assert.equal(notifications[0].actionUrl, `/boats/${boat.id}`)
    assert.include(notifications[0].title, boat.name)
  })

  test('an immediate second run regenerates nothing (cadence)', async ({ assert }) => {
    const { org } = await createProOrgWithBoat()

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()
    const analysesAfterFirst = await orgAnalyses(org.id)
    const callsAfterFirst = chatCalls

    await svc.run()

    assert.lengthOf(await orgAnalyses(org.id), analysesAfterFirst.length)
    assert.equal(chatCalls, callsAfterFirst)
  })

  test('an old analysis with an unchanged context is not regenerated (contextHash)', async ({
    assert,
  }) => {
    const { org } = await createProOrgWithBoat()

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()
    const analysesAfterFirst = await orgAnalyses(org.id)

    await backdateAnalyses(org.id)
    await svc.run()

    assert.lengthOf(await orgAnalyses(org.id), analysesAfterFirst.length)
  })

  test('a data change triggers a regeneration and a deduplicated notification', async ({
    assert,
  }) => {
    const { org, admin, engine } = await createProOrgWithBoat()

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()

    await backdateAnalyses(org.id)
    // Le changement d'usure modifie le contexte moteur ET le contexte bateau
    // (pièces à remplacer) : les deux analyses sont régénérées.
    await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Turbine',
      wearState: 'to_replace',
    }).create()
    await svc.run()

    const engineAnalyses = await orgAnalyses(org.id)
      .where('kind', 'engine_suggestions')
      .where('boatEngineId', engine.id)
    assert.lengthOf(engineAnalyses, 2)

    // La seconde notification tombe dans la fenêtre anti-doublon (6 jours).
    const notifications = await Notification.query()
      .where('userId', admin.id)
      .where('type', 'ai.suggestions_ready')
    assert.lengthOf(notifications, 1)
  })

  test('one analysis per distinct member locale', async ({ assert }) => {
    const { org, boat } = await createProOrgWithBoat('fr')
    const englishMember = await UserFactory.merge({ organizationId: org.id, locale: 'en' }).create()
    await OrganizationMembership.create({
      userId: englishMember.id,
      organizationId: org.id,
      role: 'member',
    })

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()

    const boatAnalyses = await orgAnalyses(org.id)
      .where('kind', 'boat_suggestions')
      .where('boatId', boat.id)
    assert.deepEqual(boatAnalyses.map((analysis) => analysis.locale).sort(), ['en', 'fr'])
  })

  test('a starter org is left untouched', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    await OrganizationMembership.create({ userId: user.id, organizationId: org.id, role: 'admin' })
    await BoatFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()

    assert.lengthOf(await orgAnalyses(org.id), 0)
  })

  test('an org with an exhausted token quota is skipped without failing the run', async ({
    assert,
  }) => {
    const { org } = await createProOrgWithBoat()
    const quotaSvc = await app.container.make(AiTokenQuotaService)
    await AiTokenUsage.create({
      organizationId: org.id,
      month: quotaSvc.currentMonthKey(),
      tokensUsed: 1_000_000,
    })

    const svc = await app.container.make(AiProactiveSuggestionService)
    await svc.run()

    assert.lengthOf(await orgAnalyses(org.id), 0)
  })
})
