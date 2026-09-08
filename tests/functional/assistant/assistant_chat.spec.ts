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
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'
import OrganizationAiKey from '#models/organization_ai_key'
import type { AiChatMessage } from '#services/ai_service'
import type { AiChatOptions, AiProvider, AiToolCall, AiToolDefinition } from '#shared/types/ai'
import { ASSISTANT_CONVERSATION_TOKEN_BUDGET, type AssistantMessage } from '#shared/types/assistant'

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

type AiCall = {
  messages: AiChatMessage[]
  provider: AiProvider | null
  model: string | null
  apiKey: string | null
  tools: AiToolDefinition[] | null
}

/** Une réponse scriptée du fake — string = réponse finale sans appel d'outil. */
type FakeAiTurn = { content?: string; toolCalls?: AiToolCall[]; tokensUsed?: number }

/**
 * Fake AiService qui capture messages, fournisseur, modèle, clé BYOK et outils
 * proposés. `script` est une file de réponses (#642) : chaque appel consomme
 * la suivante, la dernière est répétée — ce qui simule « appel d'outil puis
 * réponse finale ». Une simple string reste le cas d'un tour sans outil.
 */
function swapAiService(script: string | Array<string | FakeAiTurn>, tokensUsed = 42) {
  const turns: FakeAiTurn[] = (Array.isArray(script) ? script : [script]).map((turn) =>
    typeof turn === 'string' ? { content: turn } : turn
  )
  const calls: AiCall[] = []
  app.container.swap(
    AiService,
    () =>
      ({
        chat: async (messages: AiChatMessage[], options: AiChatOptions = {}) => {
          calls.push({
            messages,
            provider: options.provider ?? null,
            model: options.model ?? null,
            apiKey: options.apiKey ?? null,
            tools: options.tools ?? null,
          })
          const turn = turns[Math.min(calls.length - 1, turns.length - 1)]
          return {
            content: turn.content ?? '',
            toolCalls: turn.toolCalls ?? [],
            tokensUsed: turn.tokensUsed ?? tokensUsed,
          }
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
    const pending = conversation.pendingAction as Extract<
      import('#shared/types/assistant').AssistantPendingAction,
      { kind: 'create_task' }
    >
    assert.equal(pending.kind, 'create_task')
    assert.equal(pending.boatId, boat.id)
    assert.equal(pending.boatName, 'Mistral II')
    assert.equal(pending.engineLabel, 'Yamaha 4AS')
    assert.equal(pending.title, 'Oil change')
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
    const conversation = await makeConversation(user, {
      tokensUsed: ASSISTANT_CONVERSATION_TOKEN_BUDGET,
    })
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
    await OrganizationAiKey.create({
      organizationId: org.id,
      provider: 'mistral',
      apiKeyEncrypted: encryption.encrypt('sk-org-own-key'),
    })
    org.aiProvider = 'mistral'
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
    assert.equal(calls[0].provider, 'mistral')
    assert.equal(calls[0].apiKey, 'sk-org-own-key')

    // L'usage reste émargé pour les statistiques.
    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 1_000_060)
  })

  test('the active provider (e.g. Claude) routes the AI call with its key', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const org = await Organization.findOrFail(user.organizationId!)
    await OrganizationAiKey.create({
      organizationId: org.id,
      provider: 'anthropic',
      apiKeyEncrypted: encryption.encrypt('sk-ant-org-key'),
    })
    org.aiProvider = 'anthropic'
    await org.save()

    const calls = swapAiService(ANSWER_RESPONSE)

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertFlashMissing('error')
    assert.lengthOf(calls, 1)
    assert.equal(calls[0].provider, 'anthropic')
    assert.equal(calls[0].apiKey, 'sk-ant-org-key')
  })

  test('without an active provider the app default (Mistral) is used and quota applies', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    // Une clé enregistrée mais PAS sélectionnée comme fournisseur actif ne
    // bypasse rien : quota épuisé → l'appel est bloqué.
    const org = await Organization.findOrFail(user.organizationId!)
    await OrganizationAiKey.create({
      organizationId: org.id,
      provider: 'anthropic',
      apiKeyEncrypted: encryption.encrypt('sk-ant-org-key'),
    })
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

test.group('Assistant FleetAi chat — boucle d’outils (#642)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  const ANSWER_WITH_SOURCE = JSON.stringify({
    type: 'answer',
    message: 'The engine totals 220 hours.',
    source: 'fleet_data',
    navTarget: 'engines.index',
  })

  test('un appel d’outil est exécuté, la boucle s’arrête et seuls user + réponse sont persistés', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const calls = swapAiService([
      { toolCalls: [{ id: 't1', name: 'fleet_overview', arguments: {} }], tokensUsed: 10 },
      { content: ANSWER_WITH_SOURCE, tokensUsed: 20 },
    ])

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'How is the fleet doing?' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    // Deux appels IA : l'outil est proposé au premier, exécuté, et son
    // résultat repoussé dans le fil du second.
    assert.lengthOf(calls, 2)
    assert.isNotNull(calls[0].tools)
    assert.include(
      calls[0].tools!.map((tool) => tool.name),
      'fleet_overview'
    )
    const toolMessage = calls[1].messages.find((m) => m.role === 'tool')
    assert.isDefined(toolMessage)
    assert.equal(toolMessage!.toolCallId, 't1')
    assert.include(toolMessage!.content, 'stats')

    // Échafaudage de tour : les messages d'outils ne sont pas persistés,
    // source et navTarget le sont ; les tokens des deux tours sont sommés
    // et émargés une seule fois.
    const [conversation] = await AiAssistantConversation.all()
    assert.lengthOf(conversation.messages, 2)
    assert.equal(conversation.messages[1].source, 'fleet_data')
    assert.equal(conversation.messages[1].navTarget, 'engines.index')
    assert.equal(conversation.tokensUsed, 30)
    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 30)
  })

  test('la boucle est bornée : un modèle qui boucle épuise ses tours puis échoue proprement', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    // Le fake répète le dernier tour : appels d'outils sans fin, jamais de
    // contenu final.
    const calls = swapAiService([
      { toolCalls: [{ id: 't1', name: 'fleet_overview', arguments: {} }], tokensUsed: 10 },
    ])

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Loop forever' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )

    // 3 tours outillés + 1 appel final sans outils + 1 relance corrective.
    assert.lengthOf(calls, 5)
    assert.isNull(calls[3].tools)
    assert.isNull(calls[4].tools)
    // Rien n'est persisté en cas d'échec (invariant #602/#634).
    assert.lengthOf(await AiAssistantConversation.all(), 0)
    assert.isNull(await AiTokenUsage.query().where('organizationId', user.organizationId!).first())
  })

  test('la relance corrective récupère une réponse finale hors contrat', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const calls = swapAiService([
      { content: 'Sure! Here is my answer in plain text.', tokensUsed: 15 },
      { content: ANSWER_RESPONSE, tokensUsed: 25 },
    ])

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    assert.lengthOf(calls, 2)
    // La relance repart sans outils, avec la consigne corrective en dernier
    // message utilisateur.
    assert.isNull(calls[1].tools)
    const lastMessage = calls[1].messages.at(-1)
    assert.equal(lastMessage!.role, 'user')
    assert.include(lastMessage!.content, 'JSON')

    const [conversation] = await AiAssistantConversation.all()
    assert.equal(conversation.tokensUsed, 40)
    assert.lengthOf(conversation.messages, 2)
  })

  test('un mechanic ne se voit proposer que la maintenance et l’aide produit', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    await makeBoat(admin.organizationId!)
    const mechanic = await createMechanicUser(admin.organizationId!)
    const calls = swapAiService(ANSWER_RESPONSE)

    await client
      .post('/assistant/conversations')
      .loginAs(mechanic)
      .form({ message: 'What is overdue?' })
      .redirects(0)

    assert.lengthOf(calls, 1)
    assert.sameMembers(
      (calls[0].tools ?? []).map((tool) => tool.name),
      ['list_maintenance', 'search_product_help']
    )
  })
})

test.group('Assistant FleetAi chat — agent actionnable et contexte de page', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('une propose_action add_engine_hours est validée et rangée en pending', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat, engine } = await makeBoat(user.organizationId!)
    swapAiService(
      JSON.stringify({
        type: 'propose_action',
        message: 'Add 22 hours to the engine?',
        action: { kind: 'add_engine_hours', boatId: boat.id, engineId: engine.id, incrementBy: 22 },
      })
    )

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'We motored 22 hours this week' })
      .redirects(0)

    response.assertFlashMissing('error')
    const [conversation] = await AiAssistantConversation.all()
    const pending = conversation.pendingAction
    assert.equal(pending?.kind, 'add_engine_hours')
    if (pending?.kind === 'add_engine_hours') {
      assert.equal(pending.boatId, boat.id)
      assert.equal(pending.boatName, 'Mistral II')
      assert.equal(pending.engineLabel, 'Yamaha 4AS')
      assert.equal(pending.incrementBy, 22)
    }
  })

  test('close_trip sans sortie en cours répond au lieu de jeter le tour', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    // État normal de la flotte, pas une réponse malformée : la conversation
    // doit exister et porter une réponse, sans action en attente.
    swapAiService(
      JSON.stringify({
        type: 'propose_action',
        message: 'I will close the trip.',
        action: {
          kind: 'close_trip',
          boatId: boat.id,
          arrivedAt: '2026-09-07T18:00',
          arrivalPortName: 'Brest',
          distanceNm: null,
          engineHoursEnd: null,
          boatEngineId: null,
          fuelConsumedLiters: null,
          notes: null,
        },
      })
    )

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Close the trip for Mistral II' })
      .redirects(0)

    response.assertFlashMissing('error')
    const [conversation] = await AiAssistantConversation.all()
    assert.isNull(conversation.pendingAction)
    const last = conversation.messages.at(-1)!
    assert.equal(last.role, 'assistant')
    assert.include(last.content, 'No trip is in progress')
    assert.isUndefined(last.card)
  })

  test("le décalage de fuseau du message est recopié dans l'action en attente", async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    swapAiService(
      JSON.stringify({
        type: 'propose_action',
        message: 'Open the trip?',
        action: {
          kind: 'start_trip',
          boatId: boat.id,
          departedAt: '2026-09-07T09:00',
          departurePortName: 'Camaret',
          engineHoursStart: null,
          crewCount: null,
          notes: null,
        },
      })
    )

    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'We are leaving Camaret at 9', tzOffsetMinutes: -120 })
      .redirects(0)

    response.assertFlashMissing('error')
    const [conversation] = await AiAssistantConversation.all()
    const pending = conversation.pendingAction
    assert.equal(pending?.kind, 'start_trip')
    if (pending?.kind === 'start_trip') {
      assert.equal(pending.tzOffsetMinutes, -120)
    }
  })

  test('un kind non offert au rôle ne persiste rien', async ({ assert, client }) => {
    const admin = await createAdminUser()
    await makeBoat(admin.organizationId!)
    const mechanic = await createMechanicUser(admin.organizationId!)
    // Le mécanicien n'a pas `clients.create` : le modèle hallucine un kind qui
    // ne lui a pas été proposé — rejeté avant toute écriture.
    swapAiService(
      JSON.stringify({
        type: 'propose_action',
        message: 'Create the client?',
        action: {
          kind: 'create_client',
          firstName: 'Éric',
          lastName: 'Tabarly',
          email: null,
          phone: null,
          notes: null,
        },
      })
    )

    const response = await client
      .post('/assistant/conversations')
      .loginAs(mechanic)
      .form({ message: 'Add Éric Tabarly as a client' })
      .redirects(0)

    response.assertFlashMessage(
      'error',
      'The assistant returned an unusable answer. Please try again.'
    )
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })

  test('le prompt système porte la page courante quand pageUrl est fourni', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const { boat } = await makeBoat(user.organizationId!)
    const calls = swapAiService(ANSWER_RESPONSE)

    await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({
        message: 'What should I check on this boat?',
        pageUrl: `/boats/${boat.id}?tab=engines`,
      })
      .redirects(0)

    const system = calls[0].messages[0]
    assert.equal(system.role, 'system')
    assert.include(system.content, `Boat page for Mistral II (#${boat.id})`)
  })

  test('sans pageUrl, aucune section de page dans le prompt', async ({ assert, client }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const calls = swapAiService(ANSWER_RESPONSE)

    await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello' })
      .redirects(0)

    assert.notInclude(calls[0].messages[0].content, 'current page')
  })

  test('un pageUrl d’une autre organisation ne fuit rien dans le prompt', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    await makeBoat(user.organizationId!)
    const otherOrgAdmin = await createAdminUser()
    const { boat: foreignBoat } = await makeBoat(otherOrgAdmin.organizationId!, 'Secret Yacht')
    const calls = swapAiService(ANSWER_RESPONSE)

    await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello', pageUrl: `/boats/${foreignBoat.id}` })
      .redirects(0)

    assert.notInclude(calls[0].messages[0].content, 'Secret Yacht')
    assert.notInclude(calls[0].messages[0].content, 'current page')
  })

  test('un pageUrl trop long est rejeté par la validation, rien n’est créé', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    swapAiService(ANSWER_RESPONSE)
    const response = await client
      .post('/assistant/conversations')
      .loginAs(user)
      .form({ message: 'Hello', pageUrl: `/${'x'.repeat(320)}` })
      .redirects(0)

    // Convention Inertia : erreur de validation = redirect back avec erreurs
    // de session, jamais de page 422.
    response.assertStatus(302)
    assert.lengthOf(await AiAssistantConversation.all(), 0)
  })
})
