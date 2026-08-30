import { test } from '@japa/runner'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  buildFinalTurnInstruction,
  buildPublicDiagnosisFirstMessage,
  buildPublicDiagnosisSystemPrompt,
  parsePublicDiagnosisReply,
} from '#services/public_diagnosis_prompt_service'
import type { PublicDiagnosisStartInput } from '#shared/types/public_diagnosis'

const START_INPUT: PublicDiagnosisStartInput = {
  message: 'Le moteur démarre puis cale au bout de 30 secondes.',
  engineType: 'Hors-bord 2 temps',
  brand: 'Yamaha',
  hours: 350,
}

test.group('public_diagnosis_prompt_service — prompts (#602)', () => {
  test('the system prompt embeds the sheet digest and the two JSON shapes', ({ assert }) => {
    for (const locale of ['fr', 'en'] as const) {
      const prompt = buildPublicDiagnosisSystemPrompt(locale)
      assert.include(prompt, '"type":"question"')
      assert.include(prompt, '"type":"diagnosis"')
      // Le digest des fiches #515 est bien injecté (slug présent dans le socle).
      assert.include(prompt, '"compression"')
    }
  })

  test('the first message carries the free-text context and falls back on unknowns', ({
    assert,
  }) => {
    const full = buildPublicDiagnosisFirstMessage(START_INPUT, 'fr')
    assert.include(full, 'Yamaha')
    assert.include(full, '350')
    assert.include(full, 'cale au bout de 30 secondes')

    const bare = buildPublicDiagnosisFirstMessage(
      { message: 'Engine will not start.', engineType: null, brand: null, hours: null },
      'en'
    )
    assert.include(bare, 'not provided')
    assert.include(bare, 'Engine will not start.')
  })

  test('the final-turn instruction demands a diagnosis reply in both locales', ({ assert }) => {
    assert.include(buildFinalTurnInstruction('fr'), 'diagnosis')
    assert.include(buildFinalTurnInstruction('en'), 'diagnosis')
  })
})

test.group('public_diagnosis_prompt_service — parse (#602)', () => {
  test('parses a clarifying question', ({ assert }) => {
    const reply = parsePublicDiagnosisReply(
      '{"type":"question","message":"Le jet témoin coule-t-il ?"}'
    )
    assert.deepEqual(reply, { type: 'question', message: 'Le jet témoin coule-t-il ?' })
  })

  test('parses a final diagnosis and trims its fields', ({ assert }) => {
    const reply = parsePublicDiagnosisReply(
      `Voici : {"type":"diagnosis","summary":" Panne d'alimentation ","causes":["Évent fermé"," Filtre bouché "],"nextStep":" Vérifier la poire "}`
    )
    assert.deepEqual(reply, {
      type: 'diagnosis',
      result: {
        summary: "Panne d'alimentation",
        causes: ['Évent fermé', 'Filtre bouché'],
        nextStep: 'Vérifier la poire',
      },
    })
  })

  test('rejects invalid payloads with AiInvalidResponseError', ({ assert }) => {
    const invalid = [
      'not json at all',
      '{"type":"question","message":""}',
      '{"type":"diagnosis","summary":"","causes":["x"],"nextStep":"y"}',
      '{"type":"diagnosis","summary":"s","causes":[],"nextStep":"y"}',
      '{"type":"diagnosis","summary":"s","causes":["x"],"nextStep":""}',
      '{"type":"other","message":"m"}',
    ]
    for (const raw of invalid) {
      assert.throws(() => parsePublicDiagnosisReply(raw), AiInvalidResponseError)
    }
  })
})
