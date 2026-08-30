import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiAnalysis from '#models/ai_analysis'
import AiTokenUsage from '#models/ai_token_usage'
import BoatEngineDiagnosticCheck from '#models/boat_engine_diagnostic_check'
import AiService from '#services/ai_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type { AiChatMessage } from '#services/ai_service'

const VALID_RESPONSE = JSON.stringify({
  summary: 'Probable fuel supply issue',
  recommendedSheet: 'fuel',
  causes: ['Closed tank vent', 'Clogged fuel filter', 'Blocked idle jet'],
  nextStep: 'Check that the primer bulb firms up completely',
})

/**
 * Swaps AiService for a fake returning `content`, capturing the messages of
 * every call. Callers must restore the container in a `finally` block.
 */
function swapAiService(content: string, tokensUsed = 42) {
  const calls: AiChatMessage[][] = []
  app.container.swap(
    AiService,
    () =>
      ({
        chat: async (messages: AiChatMessage[]) => {
          calls.push(messages)
          return { content, tokensUsed }
        },
      }) as unknown as AiService
  )
  return calls
}

async function makeEligibleSetup() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    fuel: 'essence',
    strokeType: '2_stroke',
    family: 'outboard_2t',
  }).create()
  return { user, boat, engine, url: `/ai/boats/${boat.id}/engines/${engine.id}/diagnosis` }
}

/** Même montage pour un in-bord diesel saildrive, éligible depuis #576. */
async function makeSaildriveSetup() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'inboard',
    fuel: 'diesel',
    strokeType: '4_stroke',
    family: 'inboard_diesel_saildrive',
  }).create()
  return { user, boat, engine, url: `/ai/boats/${boat.id}/engines/${engine.id}/diagnosis` }
}

test.group('AI engine diagnosis — engineDiagnosis (functional, #516)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.post('/ai/boats/1/engines/1/diagnosis').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('starter plan is rejected before any AI call (UpgradePlan gate)', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

    const response = await client
      .post('/ai/boats/1/engines/1/diagnosis')
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'AI features are not available on your current plan. Upgrade to Pro or Enterprise.'
    )
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('an ineligible engine (4-stroke outboard) flashes an error and stores nothing', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      fuel: 'essence',
      strokeType: '4_stroke',
      family: 'outboard_4t',
    }).create()
    swapAiService(VALID_RESPONSE)

    const response = await client
      .post(`/ai/boats/${boat.id}/engines/${engine.id}/diagnosis`)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'Troubleshooting checklists are not available for this engine family.'
    )
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('symptoms mode persists an engine_diagnosis analysis with engine, locale and tokens', async ({
    assert,
    client,
  }) => {
    const { user, boat, engine, url } = await makeEligibleSetup()
    const calls = swapAiService(VALID_RESPONSE)

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds, soft primer bulb' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const analyses = await AiAnalysis.all()
    assert.lengthOf(analyses, 1)
    assert.equal(analyses[0].kind, 'engine_diagnosis')
    assert.equal(analyses[0].boatId, boat.id)
    assert.equal(analyses[0].boatEngineId, engine.id)
    assert.equal(analyses[0].organizationId, user.organizationId)
    assert.equal(analyses[0].locale, 'en')
    assert.equal(JSON.parse(analyses[0].responseText).recommendedSheet, 'fuel')

    // Le message utilisateur contient bien les symptômes décrits
    assert.lengthOf(calls, 1)
    assert.include(calls[0][1].content, 'stalls after 30 seconds')

    // Consommation décomptée du quota mensuel
    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 42)
  })

  /**
   * Le risque central de #576 : c'est la ligne « Moteur » et le condensé de
   * fiches injectés qui décident du cadre de raisonnement du modèle. Un diesel
   * cadré en 2 temps produirait des conseils faux.
   */
  test('an inboard diesel is prompted as such, never as a 2-stroke (#576)', async ({
    assert,
    client,
  }) => {
    const { user, url } = await makeSaildriveSetup()
    const calls = swapAiService(
      JSON.stringify({ ...JSON.parse(VALID_RESPONSE), recommendedSheet: 'diesel-fuel' })
    )

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'starts then stalls, loses power in a swell' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    assert.lengthOf(calls, 1)
    const [system, userMessage] = calls[0]

    assert.include(system.content, '"diesel-fuel"')
    assert.include(system.content, '"saildrive"')
    assert.notInclude(system.content, '2-stroke')
    assert.notInclude(system.content, '"timing"')

    assert.include(userMessage.content, 'inboard diesel, saildrive')
    assert.notInclude(userMessage.content, '(2T,')

    const analyses = await AiAnalysis.all()
    assert.equal(JSON.parse(analyses[0].responseText).recommendedSheet, 'diesel-fuel')
  })

  test('a sheet outside the engine family is rejected and nothing is stored (#576)', async ({
    assert,
    client,
  }) => {
    const { user, url } = await makeSaildriveSetup()
    // « fuel » est une fiche valide — mais c'est celle du carburateur 2 temps.
    swapAiService(VALID_RESPONSE)

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'starts then stalls' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('progress mode sends the checked steps without requiring symptoms', async ({
    assert,
    client,
  }) => {
    const { user, engine, url } = await makeEligibleSetup()
    await BoatEngineDiagnosticCheck.create({ boatEngineId: engine.id, stepKey: 'global.flywheel' })
    const calls = swapAiService(VALID_RESPONSE)

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'progress', notes: 'Compression: 110 and 108 PSI' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.lengthOf(calls, 1)
    assert.include(calls[0][1].content, 'global.flywheel')
    assert.include(calls[0][1].content, 'Compression: 110 and 108 PSI')
    assert.lengthOf(await AiAnalysis.all(), 1)
  })

  test('symptoms mode without symptoms fails validation and stores nothing', async ({
    assert,
    client,
  }) => {
    const { user, url } = await makeEligibleSetup()
    swapAiService(VALID_RESPONSE)

    const response = await client.post(url).loginAs(user).form({ mode: 'symptoms' }).redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('an invalid Mistral response flashes a dedicated error and persists nothing', async ({
    assert,
    client,
  }) => {
    const { user, url } = await makeEligibleSetup()
    swapAiService('sorry, I cannot help with that')

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('a response referencing an invented sheet is rejected like an invalid one', async ({
    assert,
    client,
  }) => {
    const { user, url } = await makeEligibleSetup()
    swapAiService(VALID_RESPONSE.replace('"fuel"', '"magic-sheet"'))

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('an exhausted monthly token quota blocks the generation', async ({ assert, client }) => {
    const { user, url } = await makeEligibleSetup()
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(VALID_RESPONSE)

    const response = await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have reached your monthly AI token limit. AI features will reset on the 1st of next month, or upgrade to Enterprise for unlimited usage.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiAnalysis.all(), 0)
  })

  test('the checklist page exposes the latest diagnosis in the current locale', async ({
    assert,
    client,
  }) => {
    const { user, boat, engine, url } = await makeEligibleSetup()
    swapAiService(VALID_RESPONSE)

    await client
      .post(url)
      .loginAs(user)
      .form({ mode: 'symptoms', symptoms: 'stalls after 30 seconds' })
      .redirects(0)

    const page = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/diagnostic`)
      .loginAs(user)
      .withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as {
      aiDiagnosis: { result: { recommendedSheet: string; causes: string[] } } | null
    }
    assert.isNotNull(props.aiDiagnosis)
    assert.equal(props.aiDiagnosis!.result.recommendedSheet, 'fuel')
    assert.lengthOf(props.aiDiagnosis!.result.causes, 3)
  })
})
