import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiAnalysis from '#models/ai_analysis'
import { AiAnalysisFactory } from '#database/factories/ai_analysis_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import AiService, { type AiChatMessage } from '#services/ai_service'

function swapAiService(response = '[{"text":"Vérifier la turbine"}]') {
  app.container.swap(
    AiService,
    () =>
      ({
        chat: async (_messages: AiChatMessage[]) => ({ content: response, tokensUsed: 42 }),
      }) as unknown as AiService
  )
  return () => app.container.restore(AiService)
}

test.group('AI engine suggestions — engineSuggestions (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /ai/boats/:boatId/engines/:engineId/suggestions redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const response = await client.post('/ai/boats/1/engines/1/suggestions').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('a starter plan is refused with the quota flash', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .post('/ai/boats/1/engines/1/suggestions')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'AI features are not available on your current plan. Upgrade to Pro or Enterprise.'
    )
  })

  test('an unknown boat redirects silently to the engine page', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/ai/boats/999999/engines/1/suggestions')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats/999999/engines/1')
    response.assertFlashMissing('error')
  })

  test('an engine not belonging to the boat flashes engine.notFound', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/ai/boats/${boat.id}/engines/999999/suggestions`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Engine not found.')
  })

  test('the happy path persists an engine_suggestions analysis and redirects to the engine page', async ({
    client,
    assert,
  }) => {
    const restore = swapAiService()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

      const response = await client
        .post(`/ai/boats/${boat.id}/engines/${engine.id}/suggestions`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}`)

      const analysis = await AiAnalysis.query()
        .where('kind', 'engine_suggestions')
        .where('boatEngineId', engine.id)
        .firstOrFail()
      assert.equal(analysis.userId, user.id)
      assert.equal(analysis.organizationId, user.organizationId)
      assert.equal(analysis.boatId, boat.id)
      assert.match(analysis.contextHash ?? '', /^[0-9a-f]{64}$/)
      assert.deepEqual(JSON.parse(analysis.responseText), [{ text: 'Vérifier la turbine' }])
    } finally {
      restore()
    }
  })

  test('the deferred aiSuggestions prop resolves to [] without any analysis (#478)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .withInertiaPartialReload('boats/engine_show', ['aiSuggestions'])

    response.assertStatus(200)
    const props = response.inertiaProps as { aiSuggestions: unknown }
    assert.deepEqual(props.aiSuggestions, [])
  })

  test('the deferred aiSuggestions prop surfaces a scheduled analysis (userId NULL)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    // Ligne générée par le job planifié : pas d'utilisateur déclencheur, mais
    // visible de tous les membres de l'organisation. Locale `en` : celle de la
    // requête de test (locale par défaut), le filtre #460 s'applique.
    await AiAnalysisFactory.merge({
      userId: null,
      organizationId: user.organizationId!,
      boatId: boat.id,
      boatEngineId: engine.id,
      kind: 'engine_suggestions',
      locale: 'en',
      responseText: JSON.stringify([{ text: 'Scheduled suggestion' }]),
      createdAt: DateTime.now(),
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .withInertiaPartialReload('boats/engine_show', ['aiSuggestions'])

    response.assertStatus(200)
    const props = response.inertiaProps as { aiSuggestions: unknown }
    assert.deepEqual(props.aiSuggestions, [{ text: 'Scheduled suggestion' }])
  })
})
