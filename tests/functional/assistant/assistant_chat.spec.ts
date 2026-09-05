import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import encryption from '@adonisjs/core/services/encryption'
import { DateTime } from 'luxon'
import AiAssistantConversation from '#models/ai_assistant_conversation'
import AiTokenUsage from '#models/ai_token_usage'
import AiService from '#services/ai_service'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import type { AiChatMessage } from '#services/ai_service'
import type { AssistantMessage } from '#shared/types/assistant'

const ANSWER_RESPONSE = JSON.stringify({
  type: 'answer',
  message: 'You have 2 urgent maintenance tasks this week.',
})

function proposeTaskResponse(boatId: number, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'propose_task',
    message: 'I can schedule the oil change for tomorrow.',
    task: {
      boatId,
      subject: 'engine',
      title: 'Oil change',
      notes: null,
      boatEngineId: null,
      dueAt: '2026-09-06',
      dueEngineHours: null,
      recurrenceIntervalMonths: null,
      recurrenceIntervalEngineHours: null,
      ...overrides,
    },
  })
}

function handoffResponse(boatId: number, engineId: number) {
  return JSON.stringify({
    type: 'handoff',
    message: 'Let us diagnose that engine.',
    target: 'diagnosis',
    boatId,
    engineId,
  })
}

type AiCall = { messages: AiChatMessage[]; modelOverride: string | null; apiKey: string | null }

/** Fake AiService qui capture messages, modèle et clé BYOK. */
function swapAiService(content: string, tokensUsed = 42) {
  const calls: AiCall[] = []
  app.container.swap(
    AiService,
    () =>
      ({
        chat: async (
          messages: AiChatMessage[],
          modelOverride?: string | null,
          apiKey?: string | null
        ) => {
          calls.push({ messages, modelOverride: modelOverride ?? null, apiKey: apiKey ?? null })
          return { content, tokensUsed }
        },
      }) as unknown as AiService
  )
  return calls
}

async function makeBoat(organizationId: number, name = 'Mistral II') {
  const boat = await BoatFactory.merge({ organizationId, name }).create()
  const engine = await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '4AS',
  }).create()
  return { boat, engine }
}

async function makeConversation(
  user: { id: number; organizationId: number | null },
  overrides: Partial<{
    token: string
    messages: AssistantMessage[]
    status: string
    tokensUsed: number
    pendingAction: object | null
  }> = {}
) {
  return AiAssistantConversation.create({
    token: overrides.token ?? 'cafebabe0001',
    userId: user.id,
    organizationId: user.organizationId,
    locale: 'en',
    status: (overrides.status ?? 'active') as 'active' | 'archived',
    messages: overrides.messages ?? [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hello, how can I help?' },
    ],
    pendingAction: (overrides.pendingAction as never) ?? null,
    tokensUsed: overrides.tokensUsed ?? 42,
  })
}

test.group('Assistant FleetAi chat (functional)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('start creates a conversation with the fleet context in the system prompt', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    const calls = swapAiService(ANSWER_RESPONSE, 77)

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Which maintenance is urgent this week?' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiAssistantConversation.all()
    assert.lengthOf(conversations, 1)
    const conversation = conversations[0]
    assert.equal(conversation.userId, user.id)
    assert.equal(conversation.status, 'active')
    assert.equal(conversation.tokensUsed, 77)
    assert.lengthOf(conversation.messages, 2)
    assert.equal(conversation.messages[0].content, 'Which maintenance is urgent this week?')
    assert.equal(conversation.messages[1].content, 'You have 2 urgent maintenance tasks this week.')
    assert.isNull(conversation.pendingAction)

    // Le prompt système porte le roster (ids réels) — jamais stocké en base.
    assert.lengthOf(calls, 1)
    assert.equal(calls[0].messages[0].role, 'system')
    assert.include(calls[0].messages[0].content, `#${boat.id} Mistral II`)
    assert.include(calls[0].messages[0].content, `#${engine.id} Yamaha 4AS`)

    // L'échange émarge le quota mensuel.
    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 77)
  })

  test('starting a new conversation archives the previous active one', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const previous = await makeConversation(user)
    swapAiService(ANSWER_RESPONSE)

    await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'New topic' })
      .redirects(0)

    await previous.refresh()
    assert.equal(previous.status, 'archived')
    const active = await AiAssistantConversation.query().where('status', 'active')
    assert.lengthOf(active, 1)
    assert.notEqual(active[0].id, previous.id)
  })

  test('a starter plan is refused with the AI quota flash and nothing persisted', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId!,
      role: 'admin',
    })
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'AI features are not available on your current plan. Upgrade to Pro or Enterprise.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })

  test('an exhausted monthly token quota blocks the chat', async ({ assert, client }) => {
    const user = await createAdminUser()
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })

  test('an invalid model reply persists nothing', async ({ assert, client }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    swapAiService('I am not JSON at all')

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })

  test('a valid task proposal is stored as pending action, never written directly', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    swapAiService(proposeTaskResponse(boat.id, { boatEngineId: engine.id }))

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Schedule the oil change for tomorrow' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiAssistantConversation.all()
    const conversation = conversations[0]
    assert.isNotNull(conversation.pendingAction)
    assert.equal(conversation.pendingAction!.boatId, boat.id)
    assert.equal(conversation.pendingAction!.boatName, 'Mistral II')
    assert.equal(conversation.pendingAction!.engineLabel, 'Yamaha 4AS')
    assert.equal(conversation.pendingAction!.title, 'Oil change')
  })

  test('a task proposal naming a boat outside the roster persists nothing', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    // Bateau d'une autre org : jamais dans le roster du prompt.
    const other = await createAdminUser()
    const { boat: foreignBoat } = await makeBoat(other.organizationId!, 'Foreign')
    swapAiService(proposeTaskResponse(foreignBoat.id))

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Schedule an oil change on Foreign' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )
    const conversations = await AiAssistantConversation.query().where('userId', user.id)
    assert.lengthOf(conversations, 0)
  })

  test('an engine-hour proposal without an engine of the boat persists nothing', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    swapAiService(
      proposeTaskResponse(boat.id, { dueAt: null, dueEngineHours: 250, boatEngineId: 999_999 })
    )

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Oil change at 250 hours' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )
    assert.lengthOf(await AiAssistantConversation.query().where('userId', user.id), 0)
  })

  test('a valid handoff attaches the card with server-resolved labels', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    swapAiService(handoffResponse(boat.id, engine.id))

    await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'My engine will not start' })
      .redirects(0)

    const conversations = await AiAssistantConversation.all()
    const conversation = conversations[0]
    const last = conversation.messages.at(-1)!
    assert.equal(last.card?.kind, 'handoff')
    if (last.card?.kind === 'handoff') {
      assert.equal(last.card.target, 'diagnosis')
      assert.equal(last.card.boatId, boat.id)
      assert.equal(last.card.engineId, engine.id)
      assert.equal(last.card.boatName, 'Mistral II')
      assert.equal(last.card.engineLabel, 'Yamaha 4AS')
    }
  })

  test('a handoff naming an engine outside the boat persists nothing', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    swapAiService(handoffResponse(boat.id, 999_999))

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'My engine will not start' })
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })

  test('a message is refused while a proposal is pending, without any AI call', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const conversation = await makeConversation(user, {
      pendingAction: {
        boatId: boat.id,
        boatName: 'Mistral II',
        engineLabel: null,
        subject: 'engine',
        title: 'Oil change',
        notes: null,
        boatEngineId: null,
        dueAt: '2026-09-06',
        dueEngineHours: null,
        recurrenceIntervalMonths: null,
        recurrenceIntervalEngineHours: null,
      },
    })
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'Actually…' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'A task proposal is awaiting your answer. Confirm or dismiss it to continue.'
    )
    assert.lengthOf(calls, 0)
  })

  test('a conversation at the message cap refuses further messages', async ({ assert, client }) => {
    const user = await createAdminUser()
    const messages: AssistantMessage[] = []
    for (let i = 0; i < 20; i++) {
      messages.push({ role: 'user', content: `message ${i}` })
      messages.push({ role: 'assistant', content: `answer ${i}` })
    }
    const conversation = await makeConversation(user, { messages })
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'One more' })
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'This conversation has reached its message limit. Start a new one to continue.'
    )
    assert.lengthOf(calls, 0)
  })

  test('a conversation over its token budget refuses further messages', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const conversation = await makeConversation(user, { tokensUsed: 100_000 })
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'One more' })
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'This conversation has reached its AI usage limit. Start a new one to continue.'
    )
    assert.lengthOf(calls, 0)
  })

  test('only the sliding history window is replayed to the model', async ({ assert, client }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const messages: AssistantMessage[] = []
    for (let i = 0; i < 15; i++) {
      messages.push({ role: 'user', content: `message ${i}` })
      messages.push({ role: 'assistant', content: `answer ${i}` })
    }
    const conversation = await makeConversation(user, { messages })
    const calls = swapAiService(ANSWER_RESPONSE)

    await client
      .post(`/assistant/conversations/${conversation.token}/messages`)
      .loginAs(user)
      .form({ message: 'Latest question' })
      .redirects(0)

    // 1 système + 12 derniers messages (fenêtre), pas les 31 du fil.
    assert.lengthOf(calls[0].messages, 13)
    assert.equal(calls[0].messages.at(-1)!.content, 'Latest question')

    // Le fil complet reste stocké.
    await conversation.refresh()
    assert.lengthOf(conversation.messages, 32)
  })

  test("another user's conversation token is treated as not found", async ({ assert, client }) => {
    const owner = await createAdminUser()
    const conversation = await makeConversation(owner)

    const other = await createAdminUser()
    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/messages`)
      .loginAs(other)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(calls, 0)
  })

  test('an org API key (BYOK) is passed to the AI call and bypasses the token quota', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const org = await Organization.findOrFail(user.organizationId!)
    org.aiApiKeyEncrypted = encryption.encrypt('sk-org-own-key')
    await org.save()

    // Quota mensuel épuisé : sans BYOK l'appel serait bloqué.
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(ANSWER_RESPONSE, 60)

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertFlashMissing('error')
    assert.lengthOf(calls, 1)
    assert.equal(calls[0].apiKey, 'sk-org-own-key')

    // L'usage reste émargé pour les statistiques.
    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 1_000_060)
  })

  test('archive closes the active conversation', async ({ assert, client }) => {
    const user = await createAdminUser()
    const conversation = await makeConversation(user)

    const response = await client
      .post(`/assistant/conversations/${conversation.token}/archive`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    await conversation.refresh()
    assert.equal(conversation.status, 'archived')
  })
})
