import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiDiagnosisConversation from '#models/ai_diagnosis_conversation'
import AiTokenUsage from '#models/ai_token_usage'
import AiService from '#services/ai_service'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { PUBLIC_DIAGNOSIS_SESSION_KEY } from '#shared/types/public_diagnosis'
import type { AiChatMessage } from '#services/ai_service'
import type { AiChatMessage as StoredChatMessage } from '#shared/types/ai'

const QUESTION_RESPONSE = JSON.stringify({
  type: 'question',
  message: 'Does the tell-tale stream flow when the engine runs?',
})

const DIAGNOSIS_RESPONSE = JSON.stringify({
  type: 'diagnosis',
  summary: 'Probable fuel supply issue',
  causes: ['Closed tank vent', 'Clogged fuel filter', 'Blocked idle jet'],
  nextStep: 'Check that the primer bulb firms up completely',
})

/** Copie du helper de `engine_diagnosis.spec.ts` : fake AiService + capture des appels. */
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

function startForm(message = 'Engine starts then stalls after 30 seconds') {
  return { message, engineType: '2-stroke outboard', brand: 'Yamaha', hours: 350 }
}

test.group('Public AI diagnosis chat (functional, #602)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    app.container.restore(AiService)
  })

  test('the marketing page renders for anonymous visitors in both locales', async ({
    assert,
    client,
  }) => {
    for (const url of ['/en/engine-diagnosis-ai', '/fr/diagnostic-panne-ia']) {
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

  test('an anonymous visitor starts a conversation: row created, context in the prompt', async ({
    assert,
    client,
  }) => {
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    const conversations = await AiDiagnosisConversation.all()
    assert.lengthOf(conversations, 1)
    const conversation = conversations[0]
    assert.isNull(conversation.userId)
    assert.isNull(conversation.organizationId)
    assert.equal(conversation.status, 'active')
    assert.equal(conversation.locale, 'en')
    assert.equal(conversation.tokensUsed, 42)
    assert.lengthOf(conversation.messages, 2)
    assert.equal(conversation.messages[0].content, 'Engine starts then stalls after 30 seconds')
    assert.include(conversation.messages[1].content, 'tell-tale stream')

    // Le prompt système embarque le socle des fiches ; le 1er message
    // utilisateur envoyé au modèle est reconstruit avec le contexte moteur.
    assert.lengthOf(calls, 1)
    assert.equal(calls[0][0].role, 'system')
    assert.include(calls[0][0].content, '"compression"')
    assert.include(calls[0][1].content, 'Yamaha')
    assert.include(calls[0][1].content, 'stalls after 30 seconds')
  })

  test('a third anonymous conversation is refused without any AI call', async ({
    assert,
    client,
  }) => {
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/diagnosis-ai/conversations')
      .withSession({ [PUBLIC_DIAGNOSIS_SESSION_KEY]: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'] })
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have used your free diagnoses. Create an account to keep maintaining your boat with FleetAi.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiDiagnosisConversation.all(), 0)
  })

  test('the owning session appends a message and cumulates tokens', async ({ assert, client }) => {
    const conversation = await AiDiagnosisConversation.create({
      token: 'cafebabe0001',
      locale: 'en',
      status: 'active',
      messages: [
        { role: 'user', content: 'Engine stalls' },
        { role: 'assistant', content: 'Does the tell-tale stream flow?' },
      ],
      tokensUsed: 42,
    })
    swapAiService(DIAGNOSIS_RESPONSE, 58)

    const response = await client
      .post(`/diagnosis-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_DIAGNOSIS_SESSION_KEY]: [conversation.token] })
      .form({ message: 'No stream at all' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')

    await conversation.refresh()
    assert.lengthOf(conversation.messages, 4)
    assert.equal(conversation.tokensUsed, 100)
    // Réponse `diagnosis` → conversation terminée, résultat persisté
    assert.equal(conversation.status, 'completed')
    assert.equal(conversation.result?.summary, 'Probable fuel supply issue')
    assert.lengthOf(conversation.result?.causes ?? [], 3)
  })

  test('a completed conversation is locked', async ({ assert, client }) => {
    const conversation = await AiDiagnosisConversation.create({
      token: 'cafebabe0002',
      locale: 'en',
      status: 'completed',
      messages: [{ role: 'user', content: 'Engine stalls' }],
      result: { summary: 'Fuel', causes: ['Vent'], nextStep: 'Check bulb' },
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`/diagnosis-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_DIAGNOSIS_SESSION_KEY]: [conversation.token] })
      .form({ message: 'One more thing' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This diagnosis is complete. Start a new conversation to describe another breakdown.'
    )
    assert.lengthOf(calls, 0)
    await conversation.refresh()
    assert.lengthOf(conversation.messages, 1)
  })

  test('a token the session does not own is treated as not found', async ({ assert, client }) => {
    const conversation = await AiDiagnosisConversation.create({
      token: 'cafebabe0003',
      locale: 'en',
      status: 'active',
      messages: [{ role: 'user', content: 'Engine stalls' }],
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`/diagnosis-ai/conversations/${conversation.token}/messages`)
      .form({ message: 'Hello' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Conversation not found.')
    assert.lengthOf(calls, 0)
  })

  test('a starter organization gets two lifetime conversations', async ({ assert, client }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    swapAiService(QUESTION_RESPONSE)

    // 1re conversation : autorisée bien que canUseAI = false sur starter
    const first = await client
      .post('/diagnosis-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)
    first.assertStatus(302)
    first.assertFlashMissing('error')

    const conversations = await AiDiagnosisConversation.all()
    assert.lengthOf(conversations, 1)
    assert.equal(conversations[0].userId, user.id)
    assert.equal(conversations[0].organizationId, user.organizationId)

    // 2e : encore autorisée
    const second = await client
      .post('/diagnosis-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)
    second.assertFlashMissing('error')

    // 3e : refusée, aucune ligne supplémentaire
    const third = await client
      .post('/diagnosis-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)
    third.assertFlashMessage(
      'error',
      'You have used your free diagnoses. Create an account to keep maintaining your boat with FleetAi.'
    )
    assert.lengthOf(await AiDiagnosisConversation.all(), 2)

    // Starter n'émarge pas au quota de tokens mensuel
    assert.lengthOf(await AiTokenUsage.all(), 0)
  })

  test('a pro plan has no conversation cap and feeds the monthly token quota', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    for (const token of ['cafebabe0004', 'cafebabe0005', 'cafebabe0006']) {
      await AiDiagnosisConversation.create({
        token,
        userId: user.id,
        organizationId: user.organizationId,
        locale: 'en',
        status: 'completed',
        messages: [{ role: 'user', content: 'x' }],
        tokensUsed: 10,
      })
    }
    swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/diagnosis-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.lengthOf(await AiDiagnosisConversation.all(), 4)

    const usage = await AiTokenUsage.query().where('organizationId', user.organizationId!).first()
    assert.equal(Number(usage!.tokensUsed), 42)
  })

  test('an exhausted monthly token quota blocks a pro conversation', async ({ assert, client }) => {
    const user = await createAdminUser()
    await AiTokenUsage.create({
      organizationId: user.organizationId!,
      month: DateTime.now().toFormat('yyyy-MM'),
      tokensUsed: 1_000_000,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/diagnosis-ai/conversations')
      .loginAs(user)
      .form(startForm())
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'You have reached your monthly AI token limit. AI features will reset on the 1st of next month, or upgrade to Enterprise for unlimited usage.'
    )
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiDiagnosisConversation.all(), 0)
  })

  test('an invalid Mistral response persists nothing', async ({ assert, client }) => {
    swapAiService('sorry, I cannot help with that')

    const response = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'The AI assistant returned an unusable response. Please try again.'
    )
    assert.lengthOf(await AiDiagnosisConversation.all(), 0)
  })

  test('validation rejects an oversized message before any AI call', async ({ assert, client }) => {
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post('/diagnosis-ai/conversations')
      .form({ message: 'x'.repeat(4001) })
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(calls, 0)
    assert.lengthOf(await AiDiagnosisConversation.all(), 0)
  })

  test('a conversation at the user-message cap refuses further messages', async ({
    assert,
    client,
  }) => {
    const messages: StoredChatMessage[] = []
    for (let i = 0; i < 10; i++) {
      messages.push({ role: 'user', content: `message ${i}` })
      messages.push({ role: 'assistant', content: `question ${i}` })
    }
    const conversation = await AiDiagnosisConversation.create({
      token: 'cafebabe0007',
      locale: 'en',
      status: 'active',
      messages,
      tokensUsed: 42,
    })
    const calls = swapAiService(QUESTION_RESPONSE)

    const response = await client
      .post(`/diagnosis-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_DIAGNOSIS_SESSION_KEY]: [conversation.token] })
      .form({ message: 'One more' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This conversation has reached its maximum size. Start a new conversation.'
    )
    assert.lengthOf(calls, 0)
  })

  test('the signup page shows the diagnostic banner with ?from=diagnostic', async ({
    assert,
    client,
  }) => {
    const page = await client.get('/signup?from=diagnostic').withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as { fromDiagnostic?: boolean; fromSimulator?: boolean }
    assert.isTrue(props.fromDiagnostic)
    assert.isFalse(props.fromSimulator ?? false)
  })
})
