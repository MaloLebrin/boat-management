import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
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
import type { AiChatMessage } from '#services/ai_service'
import type { AiChatMessage as StoredChatMessage } from '#shared/types/ai'
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

const ENGINE_UNKNOWN_RESPONSE = JSON.stringify({
  type: 'engine',
  modelCode: null,
  message: 'I could not match this serial number to a known model.',
})

// La référence '9X9-99999-99' est un leurre : elle ne doit JAMAIS sortir — la
// seule référence servie est celle de la base (anti-hallucination).
const PART_IMPELLER_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: 'lower-unit.impeller',
  message: 'That is the water pump impeller, reference 9X9-99999-99.',
})

const PART_NO_REFERENCE_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: 'lower-unit.water_pump_kit',
  message: 'That is the water pump repair kit.',
})

const PART_OUTSIDE_CATALOG_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: 'lower-unit.flux_capacitor',
  message: 'Found it.',
})

const PART_NO_MATCH_RESPONSE = JSON.stringify({
  type: 'part',
  partKey: null,
  message: 'No catalog part matches your request.',
})

/** Copie du helper de `public_diagnosis.spec.ts` : fake AiService + capture des appels. */
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

/** Bateau + moteur outboard de l'org du user ; `model` vide = non résolu. */
async function makeBoatAndEngine(
  organizationId: number,
  engineOverrides: Record<string, unknown> = {}
) {
  const boat = await BoatFactory.merge({ organizationId }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    fuel: 'essence',
    brand: 'Yamaha',
    model: '4AS',
    serialNumber: '6E0-S-123456',
    ...engineOverrides,
  }).create()
  return { boat, engine }
}

function chatUrl(boatId: number, engineId: number) {
  return `/boats/${boatId}/engines/${engineId}/spare-parts/chat`
}

const ENGINE_CONTEXT: PartSearchContext = {
  brand: 'Yamaha',
  model: '4AS',
  serialNumber: '6E0-S-123456',
  catalogBrandSlug: 'yamaha',
  family: 'outboard_4t',
  identificationFailed: false,
}

test.group('Spare part AI chat (functional, #634)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('the chat page renders for a pro plan with no conversation yet', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)

    const page = await client.get(chatUrl(boat.id, engine.id)).loginAs(user).withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as {
      engine: { id: number; serialNumber: string | null }
      conversation: unknown
      canManage: boolean
    }
    assert.equal(props.engine.id, engine.id)
    assert.equal(props.engine.serialNumber, '6E0-S-123456')
    assert.isNull(props.conversation)
    assert.isTrue(props.canManage)
  })

  test('a starter plan is redirected with the AI quota flash', async ({ assert, client }) => {
    await seedCatalog()
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId!,
      role: 'admin',
    })
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    const calls = swapAiService(QUESTION_RESPONSE)

    const page = await client.get(chatUrl(boat.id, engine.id)).loginAs(user).redirects(0)
    page.assertStatus(302)
    assert.equal(page.headers().location, `/boats/${boat.id}/engines/${engine.id}/spare-parts`)

    const post = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)
    post.assertStatus(302)
    post.assertFlashMessage(
      'error',
      'AI features are not available on your current plan. Upgrade to Pro or Enterprise.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('a resolved engine starts directly in part phase with the closed vocabulary', async ({
    assert,
    client,
  }) => {
    const { model } = await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I am looking for the water pump impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiPartSearchConversation.all()
    assert.lengthOf(conversations, 1)
    const conversation = conversations[0]
    // Court-circuit : modèle rattachable → aucune phase d'identification.
    assert.equal(conversation.phase, 'part')
    assert.equal(conversation.identifiedEngineModelId, model.id)
    assert.equal(conversation.userId, user.id)
    assert.equal(conversation.boatEngineId, engine.id)
    assert.equal(conversation.tokensUsed, 42)
    assert.isFalse(conversation.context?.identificationFailed)

    // Le prompt système porte le vocabulaire de la famille, pas la liste des
    // codes plaque ; le 1er message est reconstruit avec le contexte moteur.
    assert.lengthOf(calls, 1)
    assert.equal(calls[0][0].role, 'system')
    assert.include(calls[0][0].content, 'lower-unit.impeller')
    assert.notInclude(calls[0][0].content, '- 4AS — 6E0')
    assert.include(calls[0][1].content, 'Yamaha')
    assert.include(calls[0][1].content, '6E0-S-123456')
    assert.include(calls[0][1].content, 'water pump impeller')
  })

  test('an unresolved model starts in engine phase with plate codes and pattern', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!, { model: 'XZ-99' })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.phase, 'engine')
    assert.isNull(conversation.identifiedEngineModelId)
    assert.isFalse(conversation.context?.identificationFailed)

    assert.include(calls[0][0].content, '4AS — 6E0')
    assert.include(calls[0][0].content, YAMAHA_REFERENCE_PATTERN.template)
  })

  test('an out-of-catalog brand starts in part phase with the failure assumed', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!, {
      brand: 'Marque inconnue',
      model: 'XYZ-1',
    })
    swapAiService(QUESTION_RESPONSE)

    await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.phase, 'part')
    assert.isNull(conversation.identifiedEngineModelId)
    // Échec honnête : le repli est décidé côté backend, jamais délégué au LLM.
    assert.isTrue(conversation.context?.identificationFailed)
  })

  test('an engine reply with a listed code attaches the model and moves to part phase', async ({
    assert,
    client,
  }) => {
    const { model } = await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!, { model: 'XZ-99' })
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0001',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'engine',
      context: { ...ENGINE_CONTEXT, model: 'XZ-99' },
      messages: [
        { role: 'user', content: 'I need an impeller' },
        { role: 'assistant', content: 'What is the serial number?' },
      ],
      tokensUsed: 42,
    })
    swapAiService(ENGINE_IDENTIFIED_RESPONSE, 58)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'The plate says 6E0 S 123456' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    await conversation.refresh()
    assert.equal(conversation.phase, 'part')
    assert.equal(conversation.identifiedEngineModelId, model.id)
    assert.equal(conversation.status, 'active')
    assert.equal(conversation.tokensUsed, 100)
    assert.lengthOf(conversation.messages, 4)
    assert.include(conversation.messages[3].content, 'Yamaha 4AS')
  })

  test('an engine reply without a usable code records the honest failure', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!, { model: 'XZ-99' })
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0002',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'engine',
      context: { ...ENGINE_CONTEXT, model: 'XZ-99' },
      messages: [{ role: 'user', content: 'I need an impeller' }],
      tokensUsed: 42,
    })
    swapAiService(ENGINE_UNKNOWN_RESPONSE)

    await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'The plate is unreadable' })
      .redirects(0)

    await conversation.refresh()
    assert.equal(conversation.phase, 'part')
    assert.isNull(conversation.identifiedEngineModelId)
    assert.isTrue(conversation.context?.identificationFailed)
    assert.equal(conversation.status, 'active')
  })

  test('a part reply serves the database reference, never the model text', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    swapAiService(PART_IMPELLER_RESPONSE, 58)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I am looking for the water pump impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.status, 'completed')
    assert.equal(conversation.result?.partKey, 'lower-unit.impeller')
    // Anti-hallucination : la référence vient de la base avec sa source — pas
    // du texte du modèle (le leurre '9X9-99999-99' ne sort jamais).
    assert.equal(conversation.result?.reference?.reference, '6E0-44352-00')
    assert.isNotEmpty(conversation.result?.reference?.sourceLabel)
  })

  test('a part without a known reference completes with the retailer fallback', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    swapAiService(PART_NO_REFERENCE_RESPONSE)

    await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need the full water pump kit' })
      .redirects(0)

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.status, 'completed')
    assert.equal(conversation.result?.partKey, 'lower-unit.water_pump_kit')
    assert.isNull(conversation.result?.reference)
  })

  test('a part reply naming no catalog part completes with the honest miss', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    swapAiService(PART_NO_MATCH_RESPONSE)

    await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need a chrome cup holder' })
      .redirects(0)

    const conversations = await AiPartSearchConversation.all()
    const conversation = conversations[0]
    assert.equal(conversation.status, 'completed')
    assert.isNull(conversation.result?.partKey)
    assert.isNull(conversation.result?.reference)
  })

  test('a part key outside the vocabulary persists nothing', async ({ assert, client }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    swapAiService(PART_OUTSIDE_CATALOG_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('a completed conversation is locked', async ({ assert, client }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0003',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'completed',
      phase: 'part',
      context: ENGINE_CONTEXT,
      messages: [{ role: 'user', content: 'Impeller?' }],
      result: { partKey: 'lower-unit.impeller', reference: null },
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'One more thing' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This search is complete. Start a new search for another part.'
    )
    assert.lengthOf(calls, 0)
  })

  test('the final allowed message carries the closing instruction, the next is refused', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)

    const nineTurns: StoredChatMessage[] = []
    for (let i = 0; i < 9; i++) {
      nineTurns.push({ role: 'user', content: `message ${i}` })
      nineTurns.push({ role: 'assistant', content: `question ${i}` })
    }
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0004',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: ENGINE_CONTEXT,
      messages: nineTurns,
      tokensUsed: 42,
    })
    const calls = swapAiService(PART_NO_MATCH_RESPONSE)

    // 10e message utilisateur : l'instruction de clôture force une sortie `part`.
    const tenth = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'last try' })
      .redirects(0)
    tenth.assertFlashMissing('error')
    const lastSent = calls[0][calls[0].length - 1]
    assert.include(lastSent.content, 'final answer')
    assert.include(lastSent.content, '"part"')

    await conversation.refresh()
    assert.equal(conversation.status, 'completed')
  })

  test('a conversation at the cap refuses further messages without any AI call', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)

    const messages: StoredChatMessage[] = []
    for (let i = 0; i < 10; i++) {
      messages.push({ role: 'user', content: `message ${i}` })
      messages.push({ role: 'assistant', content: `question ${i}` })
    }
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0005',
      userId: user.id,
      organizationId: user.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: ENGINE_CONTEXT,
      messages,
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'One more' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This conversation has reached its maximum size. Start a new search.'
    )
    assert.lengthOf(calls, 0)
  })

  test("another user's conversation on the same engine is treated as not found", async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const owner = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(owner.organizationId!)
    const conversation = await AiPartSearchConversation.create({
      token: 'cafebabe0006',
      userId: owner.id,
      organizationId: owner.organizationId,
      boatEngineId: engine.id,
      locale: 'en',
      status: 'active',
      phase: 'part',
      context: ENGINE_CONTEXT,
      messages: [{ role: 'user', content: 'Impeller?' }],
      tokensUsed: 42,
    })

    const other = await UserFactory.merge({ organizationId: owner.organizationId }).create()
    await OrganizationMembership.create({
      userId: other.id,
      organizationId: owner.organizationId!,
      role: 'admin',
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations/${conversation.token}/messages`)
      .loginAs(other)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(calls, 0)
  })

  test('an exhausted monthly token quota blocks the chat and persists nothing', async ({
    assert,
    client,
  }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have reached your monthly AI token limit. AI features will reset on the 1st of next month, or upgrade to Enterprise for unlimited usage.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('a successful exchange feeds the monthly token quota', async ({ assert, client }) => {
    await seedCatalog()
    const user = await createAdminUser()
    const { boat, engine } = await makeBoatAndEngine(user.organizationId!)
    swapAiService(QUESTION_RESPONSE, 77)

    await client
      .post(`${chatUrl(boat.id, engine.id)}/conversations`)
      .loginAs(user)
      .form({ message: 'I need an impeller' })
      .redirects(0)

    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 77)
  })
})
