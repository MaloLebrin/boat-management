import { test } from '@japa/runner'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  buildEngineDiagnosisSystemPrompt,
  buildEngineDiagnosisUserMessage,
  parseEngineDiagnosisResponse,
} from '#services/engine_diagnosis_prompt_service'
import { sheetsForEngineFamily } from '#shared/helpers/diagnostic'
import type { EngineDiagnosisInput } from '#shared/types/ai'
import type { EngineFamily } from '#shared/types/engine_catalog'

const BASE_INPUT: EngineDiagnosisInput = {
  engine: {
    brand: 'Johnson',
    model: 'J50PLEA',
    hours: 320,
    strokeType: '2_stroke',
    family: 'outboard_2t',
  },
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
  test('each locale lists every sheet slug served to the engine family (#576)', ({ assert }) => {
    const families: EngineFamily[] = [
      'outboard_2t',
      'inboard_diesel_shaft',
      'inboard_diesel_saildrive',
    ]

    for (const locale of ['fr', 'en'] as const) {
      for (const family of families) {
        const prompt = buildEngineDiagnosisSystemPrompt(locale, family)
        for (const sheet of sheetsForEngineFamily(family)) {
          assert.include(
            prompt,
            `"${sheet.slug}"`,
            `${locale}/${family} prompt must list ${sheet.slug}`
          )
        }
      }
    }
  })

  test('without a family the prompt stays the 2-stroke outboard one of #516', ({ assert }) => {
    for (const locale of ['fr', 'en'] as const) {
      assert.equal(
        buildEngineDiagnosisSystemPrompt(locale),
        buildEngineDiagnosisSystemPrompt(locale, 'outboard_2t')
      )
    }
  })

  /**
   * Le risque principal de #576 : un diesel diagnostiqué en 2 temps produirait
   * des conseils faux (mélange 50:1, clapets, power pack, link & sync).
   */
  test('an inboard diesel prompt never frames the engine as a 2-stroke outboard', ({ assert }) => {
    const fr = buildEngineDiagnosisSystemPrompt('fr', 'inboard_diesel_shaft')
    assert.notInclude(fr, '2 temps')
    assert.notInclude(fr, 'hors-bord')
    assert.include(fr, 'in-bord')
    assert.include(fr, '"diesel-fuel"')

    const en = buildEngineDiagnosisSystemPrompt('en', 'inboard_diesel_shaft')
    assert.notInclude(en, '2-stroke')
    assert.notInclude(en, 'outboard')
    assert.include(en, 'inboard')
    assert.include(en, '"diesel-fuel"')
  })

  test('an inboard diesel prompt carries no 2-stroke-only sheet', ({ assert }) => {
    const prompt = buildEngineDiagnosisSystemPrompt('fr', 'inboard_diesel_saildrive')

    for (const outboardOnly of ['compression', 'ignition', 'timing', 'gearcase']) {
      assert.notInclude(
        prompt,
        `"${outboardOnly}"`,
        `${outboardOnly} must not be offered to a diesel`
      )
    }
    assert.include(prompt, '"saildrive"')
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
    assert.notInclude(fr, '{expertise}')
    assert.notInclude(fr, '{digest}')
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

  test('the engine line names the family, never a hard-coded 2T (#576)', ({ assert }) => {
    const fr = buildEngineDiagnosisUserMessage(
      { ...BASE_INPUT, engine: { ...BASE_INPUT.engine, family: 'inboard_diesel_saildrive' } },
      'fr'
    )
    assert.include(fr, 'in-bord diesel, saildrive')
    assert.notInclude(fr, '(2T,')

    const en = buildEngineDiagnosisUserMessage(
      { ...BASE_INPUT, engine: { ...BASE_INPUT.engine, family: 'inboard_diesel_shaft' } },
      'en'
    )
    assert.include(en, 'inboard diesel, shaft line')
    assert.notInclude(en, '(2T,')
  })

  test('an outboard 2-stroke is still described as such', ({ assert }) => {
    assert.include(buildEngineDiagnosisUserMessage(BASE_INPUT, 'fr'), 'hors-bord 2 temps')
    assert.include(buildEngineDiagnosisUserMessage(BASE_INPUT, 'en'), '2-stroke outboard')
  })

  test('an engine without family falls back to an explicit label', ({ assert }) => {
    const message = buildEngineDiagnosisUserMessage(
      { ...BASE_INPUT, engine: { ...BASE_INPUT.engine, family: null } },
      'fr'
    )

    assert.include(message, 'motorisation non précisée')
    assert.notInclude(message, 'null')
  })

  test('an engine without brand or checked steps falls back to labels', ({ assert }) => {
    const message = buildEngineDiagnosisUserMessage(
      {
        ...BASE_INPUT,
        engine: {
          brand: null,
          model: null,
          hours: null,
          strokeType: '2_stroke',
          family: 'outboard_2t',
        },
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

  test('rejects a sheet that does not serve the engine family (#576)', ({ assert }) => {
    // « fuel » est une fiche valide, mais c'est celle du carburateur 2 temps :
    // la recommander sur un diesel serait un conseil faux, pas une imprécision.
    assert.throws(
      () => parseEngineDiagnosisResponse(VALID_RESPONSE, 'inboard_diesel_shaft'),
      AiInvalidResponseError,
      /does not apply to this engine family/
    )

    const dieselResponse = VALID_RESPONSE.replace('"fuel"', '"diesel-fuel"')
    assert.equal(
      parseEngineDiagnosisResponse(dieselResponse, 'inboard_diesel_shaft').recommendedSheet,
      'diesel-fuel'
    )
  })

  test('without a family every known sheet is still accepted (#516)', ({ assert }) => {
    assert.equal(parseEngineDiagnosisResponse(VALID_RESPONSE).recommendedSheet, 'fuel')
  })

  test('throws AiInvalidResponseError when a required field is missing or empty', ({ assert }) => {
    const parsed = JSON.parse(VALID_RESPONSE)

    for (const field of ['summary', 'recommendedSheet', 'causes', 'nextStep']) {
      const rest: Record<string, unknown> = { ...parsed }
      delete rest[field]
      assert.throws(
        () => parseEngineDiagnosisResponse(JSON.stringify(rest)),
        AiInvalidResponseError,
        /Engine diagnosis response/,
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
