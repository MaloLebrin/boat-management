import { test } from '@japa/runner'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  buildEngineDiagnosisSystemPrompt,
  buildEngineDiagnosisUserMessage,
  parseEngineDiagnosisResponse,
} from '#services/engine_diagnosis_prompt_service'
import type { EngineDiagnosisInput } from '#shared/types/ai'
import { DIAGNOSTIC_SHEET_SLUGS } from '#shared/types/diagnostic'

const BASE_INPUT: EngineDiagnosisInput = {
  engine: { brand: 'Johnson', model: 'J50PLEA', hours: 320, strokeType: '2_stroke' },
  parts: [{ designation: 'Impeller', wearState: 'worn' }],
  maintenanceEvents: [{ title: 'Oil change', subject: 'engine', performedAt: '2026-05-10' }],
  checklist: {
    checkedStepKeys: ['global.flywheel', 'global.compression', 'compression.readings'],
    totalGlobalSteps: 11,
  },
  mode: 'symptoms',
  userText: 'Le moteur démarre puis cale après 30 secondes',
}

const VALID_RESPONSE = JSON.stringify({
  summary: "Panne d'alimentation probable",
  recommendedSheet: 'fuel',
  causes: ['Évent fermé', 'Filtre bouché', 'Pompe HS'],
  nextStep: 'Vérifier que la poire durcit complètement',
})

test.group('engine_diagnosis_prompt_service — system prompt (#516)', () => {
  test('each locale references every sheet slug of #515', ({ assert }) => {
    for (const locale of ['fr', 'en'] as const) {
      const prompt = buildEngineDiagnosisSystemPrompt(locale)
      for (const slug of DIAGNOSTIC_SHEET_SLUGS) {
        assert.include(prompt, `"${slug}"`, `${locale} prompt must list ${slug}`)
      }
    }
  })

  test('the prompt forbids inventing model-specific numeric specs', ({ assert }) => {
    assert.include(
      buildEngineDiagnosisSystemPrompt('fr'),
      "N'invente JAMAIS de spécification chiffrée propre à un modèle de moteur"
    )
    assert.include(
      buildEngineDiagnosisSystemPrompt('en'),
      'NEVER invent a numeric specification specific to an engine model'
    )
  })

  test('the English prompt is fully English, the French one fully French', ({ assert }) => {
    const en = buildEngineDiagnosisSystemPrompt('en')
    assert.include(en, 'Write everything in English')
    assert.notInclude(en, 'Tu es')

    const fr = buildEngineDiagnosisSystemPrompt('fr')
    assert.include(fr, 'Rédige tout en français')
    assert.include(fr, 'Tu es un mécanicien expert')
  })
})

test.group('engine_diagnosis_prompt_service — user message (#516)', () => {
  test('symptoms mode embeds the engine sheet, checked steps and the user text', ({ assert }) => {
    const message = buildEngineDiagnosisUserMessage(BASE_INPUT, 'fr')

    assert.include(message, 'Johnson J50PLEA')
    assert.include(message, '320h')
    assert.include(message, 'Impeller')
    assert.include(message, 'global.compression')
    assert.include(message, 'compression.readings')
    assert.include(message, '2/11')
    assert.include(message, 'Le moteur démarre puis cale après 30 secondes')
  })

  test('progress mode without notes says so instead of leaving a blank', ({ assert }) => {
    const message = buildEngineDiagnosisUserMessage(
      { ...BASE_INPUT, mode: 'progress', userText: '' },
      'en'
    )

    assert.include(message, 'No notes entered.')
    assert.include(message, "Review the user's progress")
  })

  test('an engine without brand or checked steps falls back to labels', ({ assert }) => {
    const message = buildEngineDiagnosisUserMessage(
      {
        ...BASE_INPUT,
        engine: { brand: null, model: null, hours: null, strokeType: '2_stroke' },
        parts: [],
        maintenanceEvents: [],
        checklist: { checkedStepKeys: [], totalGlobalSteps: 11 },
      },
      'en'
    )

    assert.include(message, 'unknown brand')
    assert.include(message, 'No step checked yet.')
  })
})

test.group('engine_diagnosis_prompt_service — parser (#516)', () => {
  test('parses a valid JSON object, trimming every field', ({ assert }) => {
    const result = parseEngineDiagnosisResponse(VALID_RESPONSE)

    assert.equal(result.summary, "Panne d'alimentation probable")
    assert.equal(result.recommendedSheet, 'fuel')
    assert.deepEqual(result.causes, ['Évent fermé', 'Filtre bouché', 'Pompe HS'])
    assert.equal(result.nextStep, 'Vérifier que la poire durcit complètement')
  })

  test('extracts the JSON object out of surrounding prose', ({ assert }) => {
    const result = parseEngineDiagnosisResponse(
      `Voici mon analyse :\n${VALID_RESPONSE}\nBon vent !`
    )

    assert.equal(result.recommendedSheet, 'fuel')
  })

  test('throws AiInvalidResponseError on non-JSON content', ({ assert }) => {
    assert.throws(() => parseEngineDiagnosisResponse('je ne sais pas'), AiInvalidResponseError)
  })

  test('throws AiInvalidResponseError on an invented sheet slug', ({ assert }) => {
    const raw = VALID_RESPONSE.replace('"fuel"', '"fiche-9"')

    assert.throws(() => parseEngineDiagnosisResponse(raw), AiInvalidResponseError)
  })

  test('throws AiInvalidResponseError when a required field is missing or empty', ({ assert }) => {
    const parsed = JSON.parse(VALID_RESPONSE)

    for (const field of ['summary', 'recommendedSheet', 'causes', 'nextStep']) {
      const rest: Record<string, unknown> = { ...parsed }
      delete rest[field]
      assert.throws(
        () => parseEngineDiagnosisResponse(JSON.stringify(rest)),
        AiInvalidResponseError,
        undefined,
        `missing ${field} must throw`
      )
    }

    assert.throws(
      () => parseEngineDiagnosisResponse(JSON.stringify({ ...parsed, causes: [] })),
      AiInvalidResponseError
    )
    assert.throws(
      () => parseEngineDiagnosisResponse(JSON.stringify({ ...parsed, summary: '   ' })),
      AiInvalidResponseError
    )
  })
})
