import { test } from '@japa/runner'
import AiAnalysis from '#models/ai_analysis'
import { AiAnalysisFactory } from '#database/factories/ai_analysis_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import app from '@adonisjs/core/services/app'
import AiAnalysisService from '#services/ai_analysis_service'
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
    const result = await svc.getLatestFleetAnalysis(userB.id, orgB.id)
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
    const result = await svc.getLatestFleetAnalysis(userA.id, orgB.id)
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
    const result = await svc.getLatestFleetAnalysis(userA.id, orgA.id)
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
      responseText: JSON.stringify([{ text: 'Org A boat suggestion' }]),
      createdAt: DateTime.now(),
    })

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestBoatSuggestions(userA.id, boat.id, orgB.id)
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
      responseText: JSON.stringify([{ text: 'suggestion' }]),
      createdAt: DateTime.now(),
    })

    const svc = await app.container.make(AiAnalysisService)
    const result = await svc.getLatestBoatSuggestions(userA.id, boat.id, orgA.id)
    assert.isNotNull(result)
    assert.equal(result!.id, created.id)
  })
})
