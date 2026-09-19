import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiDiagnosisConversation from '#models/ai_diagnosis_conversation'
import AiPartSearchConversation from '#models/ai_part_search_conversation'
import PublicAiUsage from '#models/public_ai_usage'
import PublicAiBudgetService from '#services/public_ai_budget_service'
import { PUBLIC_DIAGNOSIS_SESSION_KEY } from '#shared/types/public_diagnosis'
import {
  PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY,
  PUBLIC_AI_DAILY_TOKEN_BUDGET,
  PUBLIC_AI_GLOBAL_CLIENT_KEY,
  PUBLIC_AI_GLOBAL_SURFACE,
} from '#shared/constants/public_ai_budget'
import { restoreAiService, swapAiService } from '#tests/support/fakes'

/**
 * Bornes de coût de la surface IA publique (#762).
 *
 * Les deux chats publics appellent Mistral de façon synchrone, avec la clé de
 * l'app, pour des visiteurs anonymes dont le coût n'est imputé à personne. Le
 * seul plafond par visiteur vivait **dans la session** : vider ses cookies le
 * remettait à zéro, et le throttle par IP laissait passer ~8 600 appels par
 * jour et par IP — aucune borne du tout depuis un pool d'IP.
 *
 * Deux garde-fous, testés ici :
 *
 * - le compteur par IP **persiste entre deux sessions** ;
 * - le budget de tokens global dégrade les **deux** chats, avec un message qui
 *   dit que ce n'est pas la faute du visiteur.
 */

const QUESTION_RESPONSE = JSON.stringify({
  type: 'question',
  message: 'Does the tell-tale stream flow when the engine runs?',
})

const PART_QUESTION_RESPONSE = JSON.stringify({
  type: 'question',
  message: 'Which part of the engine is concerned?',
})

function startForm(message = 'Engine starts then stalls after 30 seconds') {
  return { message, engineType: '2-stroke outboard', brand: 'Yamaha', hours: 350 }
}

/** Écrit directement la ligne agrégée du jour, pour simuler un budget épuisé. */
async function drainGlobalBudget(tokens = PUBLIC_AI_DAILY_TOKEN_BUDGET) {
  await PublicAiUsage.create({
    day: DateTime.now(),
    surface: PUBLIC_AI_GLOBAL_SURFACE,
    clientKey: PUBLIC_AI_GLOBAL_CLIENT_KEY,
    conversations: 0,
    tokensUsed: tokens,
  })
}

test.group('Surface IA publique — bornes de coût (#762)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => {
    restoreAiService()
  })

  test('le plafond par IP survit à un vidage de cookies', async ({ assert, client }) => {
    swapAiService(QUESTION_RESPONSE)

    // Chaque requête part avec une session vierge (le client Japa isole les
    // sessions) : c'est exactement ce que fait un visiteur qui vide ses
    // cookies entre deux conversations. Avant #762, le compteur de session
    // repartait de zéro à chaque fois et rien ne l'arrêtait.
    for (let i = 0; i < PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY; i++) {
      const response = await client
        .post('/diagnosis-ai/conversations')
        .form(startForm())
        .redirects(0)
      response.assertStatus(302)
      response.assertFlashMissing('error')
    }

    assert.lengthOf(await AiDiagnosisConversation.all(), PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY)

    const refused = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)
    refused.assertStatus(302)
    refused.assertFlashMessage(
      'error',
      'You have used your free diagnoses. Create an account to keep maintaining your boat with FleetAi.'
    )

    // Rien de plus n'a été créé : le refus tombe avant l'appel au modèle.
    assert.lengthOf(await AiDiagnosisConversation.all(), PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY)
  })

  test('les deux chats publics ne se volent pas leur plafond de conversations', async ({
    assert,
    client,
  }) => {
    swapAiService(QUESTION_RESPONSE)

    for (let i = 0; i < PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY; i++) {
      await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)
    }
    const refused = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)
    refused.assertStatus(302)
    assert.lengthOf(await AiDiagnosisConversation.all(), PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY)

    // La recherche de pièce a son propre compteur : le diagnostic épuisé ne la
    // ferme pas. Ce sont deux tunnels d'acquisition distincts.
    swapAiService(PART_QUESTION_RESPONSE)
    const parts = await client
      .post('/parts-ai/conversations')
      .form({ message: 'I need a water pump impeller', brand: 'Yamaha' })
      .redirects(0)

    parts.assertStatus(302)
    parts.assertFlashMissing('error')
    assert.lengthOf(await AiPartSearchConversation.all(), 1)
  })

  test('le budget global épuisé dégrade les deux chats avec le bon message', async ({
    assert,
    client,
  }) => {
    swapAiService(QUESTION_RESPONSE)
    await drainGlobalBudget()

    const expected =
      "Our free AI assistants have reached today's usage limit. Create an account to keep going — your plan comes with its own AI budget."

    const diagnosis = await client
      .post('/diagnosis-ai/conversations')
      .form(startForm())
      .redirects(0)
    diagnosis.assertStatus(302)
    diagnosis.assertFlashMessage('error', expected)

    const parts = await client
      .post('/parts-ai/conversations')
      .form({ message: 'I need a water pump impeller', brand: 'Yamaha' })
      .redirects(0)
    parts.assertStatus(302)
    parts.assertFlashMessage('error', expected)

    // Aucun appel Mistral : c'est tout l'objet du budget.
    assert.lengthOf(await AiDiagnosisConversation.all(), 0)
    assert.lengthOf(await AiPartSearchConversation.all(), 0)
  })

  test('les tokens des anonymes sont comptés, par IP et globalement', async ({
    assert,
    client,
  }) => {
    swapAiService(QUESTION_RESPONSE)

    const response = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)
    response.assertStatus(302)

    const rows = await PublicAiUsage.query().orderBy('surface')
    // Deux lignes : celle du visiteur (`diagnosis`) et l'agrégée (`all`).
    assert.lengthOf(rows, 2)

    const global = rows.find((row) => row.surface === PUBLIC_AI_GLOBAL_SURFACE)!
    const perIp = rows.find((row) => row.surface === 'diagnosis')!

    assert.equal(global.clientKey, PUBLIC_AI_GLOBAL_CLIENT_KEY)
    assert.equal(global.tokensUsed, 42)
    assert.equal(perIp.tokensUsed, 42)
    assert.equal(perIp.conversations, 1)

    // La clé du visiteur n'est **jamais** son IP : ce serait un journal
    // d'adresses. C'est un HMAC salé par le jour, donc pas non plus
    // recoupable d'un jour à l'autre.
    assert.notInclude(perIp.clientKey, '127.0.0.1')
    assert.match(perIp.clientKey, /^[0-9a-f]{32}$/)
  })

  test('un budget épuisé coupe aussi les messages suivants, pas seulement les ouvertures', async ({
    assert,
    client,
  }) => {
    swapAiService(QUESTION_RESPONSE)

    const started = await client.post('/diagnosis-ai/conversations').form(startForm()).redirects(0)
    started.assertStatus(302)

    const [conversation] = await AiDiagnosisConversation.all()
    const budgetService = await app.container.make(PublicAiBudgetService)
    await budgetService.recordTokens('diagnosis', '127.0.0.1', PUBLIC_AI_DAILY_TOKEN_BUDGET)

    // Chaque tour est un appel Mistral de plus : le budget se vérifie à chaque
    // message, pas seulement à l'ouverture.
    const refused = await client
      .post(`/diagnosis-ai/conversations/${conversation.token}/messages`)
      .withSession({ [PUBLIC_DIAGNOSIS_SESSION_KEY]: [conversation.token] })
      .form({ message: 'Yes, water flows normally' })
      .redirects(0)

    refused.assertStatus(302)
    refused.assertFlashMessage(
      'error',
      "Our free AI assistants have reached today's usage limit. Create an account to keep going — your plan comes with its own AI budget."
    )

    await conversation.refresh()
    // Le fil n'a pas bougé : la question initiale et sa réponse, rien de plus.
    assert.lengthOf(conversation.messages, 2)
  })

  test('la purge efface les compteurs périmés, garde ceux du jour', async ({ assert }) => {
    const budgetService = await app.container.make(PublicAiBudgetService)

    await PublicAiUsage.create({
      day: DateTime.now().minus({ days: 30 }),
      surface: 'diagnosis',
      clientKey: 'a'.repeat(32),
      conversations: 3,
      tokensUsed: 900,
    })
    await budgetService.recordTokens('diagnosis', '203.0.113.7', 100)

    assert.equal(await budgetService.purgeExpired(), 1)
    const remaining = await PublicAiUsage.all()
    assert.isNotEmpty(remaining)
    for (const row of remaining) {
      assert.equal(row.day.toISODate(), budgetService.today())
    }
  })
})
