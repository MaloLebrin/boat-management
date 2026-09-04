import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiPartSearchConversation from '#models/ai_part_search_conversation'
import AiTokenUsage from '#models/ai_token_usage'
import AiService from '#services/ai_service'
import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import EnginePartReference from '#models/engine_part_reference'
import OrganizationMembership from '#models/organization_membership'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { YAMAHA_REFERENCE_PATTERN } from '#shared/helpers/spare_parts'
import { PUBLIC_PART_SEARCH_SESSION_KEY } from '#shared/types/spare_part_chat'
import type { AiChatMessage } from '#services/ai_service'
import type { PartSearchContext } from '#shared/types/spare_part_chat'

const QUESTION_RESPONSE = JSON.stringify({
  type: 'question',
  message: 'What is the serial number on the identification plate?',
})

const ENGINE_IDENTIFIED_RESPONSE = JSON.stringify({
  type: 'engine',
  modelCode: '6E0',
  message: 'Engine identified: Yamaha 4AS.',
})

// La référence '9X9-99999-99' est un leurre : elle ne doit JAMAIS sortir — la
// seule référence servie est celle de la base (anti-hallucination).
const PART_IMPELLER_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: 'lower-unit.impeller',
  message: 'That is the water pump impeller, reference 9X9-99999-99.',
})

const PART_OUTSIDE_CATALOG_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: 'lower-unit.flux_capacitor',
  message: 'Found it.',
})

/** Copie du helper de `spare_part_chat.spec.ts` : fake AiService + capture des appels. */
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

/** Catalogue minimal : Yamaha 4AS (code plaque 6E0) + une référence de turbine. */
async function seedCatalog() {
  const yamaha = await EngineBrand.create({
    slug: 'yamaha',
    name: 'Yamaha',
    country: 'JP',
    families: ['outboard_thermal'],
    aliases: ['yamaha', 'yam'],
    isActive: true,
    referencePattern: YAMAHA_REFERENCE_PATTERN,
  })

  const model = await EngineModel.create({
    engineBrandId: yamaha.id,
    slug: '4as',
    name: '4AS',
    modelCode: '6E0',
    family: 'outboard_thermal',
    strokeType: '2_stroke',
    fuel: 'essence',
  })

  const reference = await EnginePartReference.create({
    engineModelId: model.id,
    partKey: 'lower-unit.impeller',
    reference: '6E0-44352-00',
    sourceLabel: 'Catalogue Partzilla — Yamaha',
    sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  })

  return { yamaha, model, reference }
}

/** Snapshot d'une conversation publique en phase `engine` (marque résolue). */
const PUBLIC_ENGINE_CONTEXT: PartSearchContext = {
  brand: 'Yamaha',
  model: null,
  serialNumber: '6E0-S-123456',
  catalogBrandSlug: 'yamaha',
  family: null,
  identificationFailed: false,
}

function startForm(message = 'I am looking for the water pump impeller') {
  return { message, brand: 'Yamaha', serialNumber: '6E0-S-123456' }
}

test.group('Public spare part AI chat (functional, #634 Phase 2)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('the marketing page renders for anonymous visitors in both locales', async ({
    assert,
    client,
  }) => {
    for (const url of ['/en/engine-part-finder-ai', '/fr/reference-piece-moteur-ia']) {
      const page = await client.get(url).withInertia()
      page.assertStatus(200)
      const props = page.inertiaProps as {
        isAuthenticated: boolean
        quota: { used: number; limit: number | null }
        conversation: unknown
      }
      assert.isFalse(props.isAuthenticated)
      assert.deepEqual(props.quota, { used: 0, limit: 2 })
      assert.isNull(props.conversation)
    }
  })

  test('an anonymous start with a catalog brand opens the engine phase', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client.post('/parts-ai/conversations').form(startForm()).redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiPartSearchConversation.all()
    assert.lengthOf(conversations, 1)
    const conversation = conversations[0]
    assert.isNull(conversation.userId)
    assert.isNull(conversation.organizationId)
    assert.isNull(conversation.boatEngineId)
    assert.equal(conversation.phase, 'engine')
    assert.equal(conversation.context?.catalogBrandSlug, 'yamaha')
    assert.isFalse(conversation.context?.identificationFailed)
    assert.equal(conversation.tokensUsed, 42)

    // Le prompt d'identification porte la liste des codes plaque et le motif
    // de référence de la marque ; le 1er message est reconstruit avec la saisie.
    assert.lengthOf(calls, 1)
    assert.equal(calls[0][0].role, 'system')
    assert.include(calls[0][0].content, '4AS — 6E0')
    assert.include(calls[0][0].content, YAMAHA_REFERENCE_PATTERN.template)
    assert.include(calls[0][1].content, 'Yamaha')
    assert.include(calls[0][1].content, '6E0-S-123456')
    assert.include(calls[0][1].content, 'water pump impeller')
  })

  test('an out-of-catalog brand starts in part phase with the full vocabulary', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const calls = swapAiService(QUESTION_RESPONSE)

    await client
      .post('/parts-ai/conversations')
      .form({ message: 'I need an impeller', brand: 'Marque inconnue', serialNumber: 'XYZ-1' })
      .redirects(0)

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.phase, 'part')
    // Échec honnête assumé d'emblée : le repli est décidé côté backend.
    assert.isTrue(conversation.context?.identificationFailed)

    // Famille inconnue → catalogue complet, pas le repli générique
    // (démarrage/commandes) qui ne contiendrait pas l'embase.
    assert.include(calls[0][0].content, 'lower-unit.impeller')
  })

  test('a third anonymous conversation is refused without any AI call', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/parts-ai/conversations')
      .withSession({ [PUBLIC_PART_SEARCH_SESSION_KEY]: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'] })
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have used your free part searches. Create an account to keep maintaining your boat with FleetAi.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('the owning session identifies the engine and narrows the vocabulary family', async ({
    assert,
    client,
  }) => {
    const { model } = await seedCatalog()
    const conversation = await AiPartSearchConversation.create({
      token: 'feedface0001',
      locale: 'en',
      status: 'active',
      phase: 'engine',
      context: PUBLIC_ENGINE_CONTEXT,
      messages: [
        { role: 'user', content: 'I need an impeller' },
        { role: 'assistant', content: 'What is the serial number?' },
      ],
      tokensUsed: 42,
    })
    swapAiService(ENGINE_IDENTIFIED_RESPONSE, 58)

    const response = await client
      .post(`/parts-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_PART_SEARCH_SESSION_KEY]: [conversation.token] })
      .form({ message: 'The plate says 6E0 S 123456' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    await conversation.refresh()
    assert.equal(conversation.phase, 'part')
    assert.equal(conversation.identifiedEngineModelId, model.id)
    // Le modèle identifié fournit le snapshot d'affichage (code plaque pour
    // les liens revendeurs) et la famille qui rétrécit le vocabulaire.
    assert.equal(conversation.context?.model, '6E0')
    assert.equal(conversation.context?.family, 'outboard_2t')
    assert.equal(conversation.tokensUsed, 100)
  })

  test('a token the session does not own is treated as not found', async ({ assert, client }) => {
    await seedCatalog()
    const conversation = await AiPartSearchConversation.create({
      token: 'feedface0002',
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: PUBLIC_ENGINE_CONTEXT,
      messages: [{ role: 'user', content: 'Impeller?' }],
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`/parts-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_PART_SEARCH_SESSION_KEY]: ['cccccccccccc'] })
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(calls, 0)
  })

  test('a part reply serves the database reference, never the model text', async ({
    assert,
    client,
  }) => {
    const { model } = await seedCatalog()
    const conversation = await AiPartSearchConversation.create({
      token: 'feedface0003',
      identifiedEngineModelId: model.id,
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: { ...PUBLIC_ENGINE_CONTEXT, model: '6E0', family: 'outboard_2t' },
      messages: [
        { role: 'user', content: 'I need an impeller' },
        { role: 'assistant', content: 'Engine identified: Yamaha 4AS.' },
      ],
      tokensUsed: 42,
    })
    swapAiService(PART_IMPELLER_RESPONSE, 58)

    const response = await client
      .post(`/parts-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_PART_SEARCH_SESSION_KEY]: [conversation.token] })
      .form({ message: 'The water pump impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    await conversation.refresh()
    assert.equal(conversation.status, 'completed')
    assert.equal(conversation.result?.partKey, 'lower-unit.impeller')
    // Anti-hallucination : la référence vient de la base avec sa source — pas
    // du texte du modèle (le leurre '9X9-99999-99' ne sort jamais).
    assert.equal(conversation.result?.reference?.reference, '6E0-44352-00')
    assert.isNotEmpty(conversation.result?.reference?.sourceLabel)
  })

  test('a part key outside the vocabulary persists nothing', async ({ assert, client }) => {
    await seedCatalog()
    swapAiService(PART_OUTSIDE_CATALOG_RESPONSE)

    const response = await client
      .post('/parts-ai/conversations')
      .form({ message: 'I need an impeller', brand: 'Marque inconnue', serialNumber: null })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('a starter plan is capped at two public conversations counted in database', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId!,
      role: 'admin',
    })
    for (const token of ['feedface0004', 'feedface0005']) {
      await AiPartSearchConversation.create({
        token,
        userId: user.id,
        organizationId: user.organizationId,
        locale: 'en',
        status: 'completed',
        phase: 'part',
        context: PUBLIC_ENGINE_CONTEXT,
        messages: [{ role: 'user', content: 'Impeller?' }],
        result: { partKey: null, reference: null },
        tokensUsed: 42,
      })
    }
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/parts-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have used your free part searches. Create an account to keep maintaining your boat with FleetAi.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 2)
    assert.lengthOf(await AiTokenUsage.all(), 0)
  })

  test('an AI plan has no conversation cap and feeds the monthly token quota', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    for (const token of ['feedface0006', 'feedface0007', 'feedface0008']) {
      await AiPartSearchConversation.create({
        token,
        userId: user.id,
        organizationId: user.organizationId,
        locale: 'en',
        status: 'completed',
        phase: 'part',
        context: PUBLIC_ENGINE_CONTEXT,
        messages: [{ role: 'user', content: 'Impeller?' }],
        result: { partKey: null, reference: null },
        tokensUsed: 42,
      })
    }
    swapAiService(QUESTION_RESPONSE, 77)

    const response = await client
      .post('/parts-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.lengthOf(await AiPartSearchConversation.all(), 4)

    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 77)
  })

  test('an exhausted monthly token quota blocks an AI plan and persists nothing', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/parts-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have reached your monthly AI token limit. AI features will reset on the 1st of next month, or upgrade to Enterprise for unlimited usage.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('a connected-app conversation stays invisible and unreachable from the public chat', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    // Une conversation Phase 1 se reconnaît à son `boat_engine_id` non null.
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, kind: 'outboard' }).create()
    const phaseOneConversation = await AiPartSearchConversation.create({
      token: 'feedface0009',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: PUBLIC_ENGINE_CONTEXT,
      messages: [{ role: 'user', content: 'Impeller?' }],
      tokensUsed: 42,
    })

    const page = await client.get('/en/engine-part-finder-ai').loginAs(user).withInertia()
    page.assertStatus(200)
    assert.isNull((page.inertiaProps as { conversation: unknown }).conversation)

    const calls = swapAiService(QUESTION_RESPONSE)
    const response = await client
      .post(`/parts-ai/conversations/${phaseOneConversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(calls, 0)
  })

  test('the signup page shows the parts funnel notice', async ({ assert, client }) => {
    const page = await client.get('/signup?from=parts').withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as { fromPartsAi?: boolean; fromDiagnostic?: boolean }
    assert.isTrue(props.fromPartsAi)
    assert.isFalse(props.fromDiagnostic ?? false)
  })
})
