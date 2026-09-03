import { test } from '@japa/runner'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  buildEngineIdentificationSystemPrompt,
  buildPartSearchFinalTurnInstruction,
  buildPartSearchFirstMessage,
  buildPartSearchSystemPrompt,
  parseSparePartChatReply,
} from '#services/spare_part_chat_prompt_service'
import { YAMAHA_REFERENCE_PATTERN } from '#shared/helpers/spare_parts'

const ENGINE_INPUT = {
  brandName: 'Yamaha',
  serialNumber: '6E0-S-123456',
  referencePattern: YAMAHA_REFERENCE_PATTERN,
  modelLines: '- 4AS — 6E0\n- 5C — 6E3',
}

const PART_INPUT = {
  engineLabel: 'Yamaha 4AS',
  vocabularyLines: '- lower-unit.impeller — Impeller\n- unreferenced.spark_plug — Spark plug',
}

test.group('spare_part_chat_prompt_service — prompts (#634)', () => {
  test('the engine prompt embeds serial, pattern, model list and the two JSON shapes', ({
    assert,
  }) => {
    for (const locale of ['fr', 'en'] as const) {
      const prompt = buildEngineIdentificationSystemPrompt(locale, ENGINE_INPUT)
      assert.include(prompt, 'Yamaha')
      assert.include(prompt, '6E0-S-123456')
      assert.include(prompt, YAMAHA_REFERENCE_PATTERN.template)
      assert.include(prompt, '- 4AS — 6E0')
      assert.include(prompt, '"type":"question"')
      assert.include(prompt, '"type":"engine"')
    }
  })

  test('an engine prompt without pattern or serial falls back honestly', ({ assert }) => {
    const prompt = buildEngineIdentificationSystemPrompt('en', {
      ...ENGINE_INPUT,
      serialNumber: null,
      referencePattern: null,
    })
    assert.include(prompt, 'not provided')
    assert.notInclude(prompt, '{modelCode}-{functionCode}')
    assert.notInclude(prompt, '{patternHint}')
  })

  test('the part prompt embeds the closed vocabulary and the anti-reference rule', ({ assert }) => {
    for (const locale of ['fr', 'en'] as const) {
      const prompt = buildPartSearchSystemPrompt(locale, PART_INPUT)
      assert.include(prompt, 'Yamaha 4AS')
      assert.include(prompt, 'lower-unit.impeller')
      assert.include(prompt, '"type":"part"')
      // La consigne anti-hallucination : la référence vient de la base, pas du LLM.
      assert.include(prompt.toLowerCase(), locale === 'fr' ? 'jamais de référence' : 'never quote')
    }
  })

  test('the first message carries the engine context and falls back on unknowns', ({ assert }) => {
    const full = buildPartSearchFirstMessage(
      {
        message: 'Je cherche la turbine de la pompe à eau.',
        brand: 'Yamaha',
        model: '4AS',
        serialNumber: '6E0-S-123456',
      },
      'fr'
    )
    assert.include(full, 'Yamaha')
    assert.include(full, '4AS')
    assert.include(full, '6E0-S-123456')
    assert.include(full, 'turbine de la pompe à eau')

    const bare = buildPartSearchFirstMessage(
      { message: 'Impeller please.', brand: null, model: null, serialNumber: null },
      'en'
    )
    assert.include(bare, 'not provided')
    assert.include(bare, 'Impeller please.')
  })

  test('the final-turn instruction targets the current phase in both locales', ({ assert }) => {
    for (const locale of ['fr', 'en'] as const) {
      assert.include(buildPartSearchFinalTurnInstruction(locale, 'engine'), '"engine"')
      assert.include(buildPartSearchFinalTurnInstruction(locale, 'part'), '"part"')
    }
  })
})

test.group('spare_part_chat_prompt_service — parse (#634)', () => {
  test('parses a clarifying question in both phases', ({ assert }) => {
    for (const phase of ['engine', 'part'] as const) {
      const reply = parseSparePartChatReply(
        '{"type":"question","message":"Quel est le numéro de série ?"}',
        phase
      )
      assert.deepEqual(reply, { type: 'question', message: 'Quel est le numéro de série ?' })
    }
  })

  test('parses an engine reply in engine phase, code trimmed or null', ({ assert }) => {
    const identified = parseSparePartChatReply(
      '{"type":"engine","modelCode":" 6E0 ","message":"Modèle identifié."}',
      'engine'
    )
    assert.deepEqual(identified, { type: 'engine', modelCode: '6E0', message: 'Modèle identifié.' })

    const unknown = parseSparePartChatReply(
      '{"type":"engine","modelCode":null,"message":"Je ne peux pas trancher."}',
      'engine'
    )
    assert.deepEqual(unknown, {
      type: 'engine',
      modelCode: null,
      message: 'Je ne peux pas trancher.',
    })
  })

  test('parses a part reply in part phase, key trimmed or null', ({ assert }) => {
    const matched = parseSparePartChatReply(
      '{"type":"part","partKey":"lower-unit.impeller","message":"C\'est la turbine."}',
      'part'
    )
    assert.deepEqual(matched, {
      type: 'part',
      partKey: 'lower-unit.impeller',
      message: "C'est la turbine.",
    })

    const none = parseSparePartChatReply(
      '{"type":"part","partKey":null,"message":"Aucune pièce ne correspond."}',
      'part'
    )
    assert.deepEqual(none, { type: 'part', partKey: null, message: 'Aucune pièce ne correspond.' })
  })

  test('extracts the JSON object from surrounding chatter', ({ assert }) => {
    const reply = parseSparePartChatReply(
      'Voici ma réponse : {"type":"question","message":"Le code plaque ?"} — bonne chance !',
      'engine'
    )
    assert.equal(reply.type, 'question')
  })

  test('a reply type foreign to the current phase is invalid', ({ assert }) => {
    assert.throws(
      () =>
        parseSparePartChatReply('{"type":"part","partKey":null,"message":"Hors phase."}', 'engine'),
      AiInvalidResponseError
    )
    assert.throws(
      () =>
        parseSparePartChatReply(
          '{"type":"engine","modelCode":null,"message":"Hors phase."}',
          'part'
        ),
      AiInvalidResponseError
    )
  })

  test('rejects invalid JSON, missing message and unknown types', ({ assert }) => {
    assert.throws(() => parseSparePartChatReply('je ne peux pas vous aider', 'part'))
    assert.throws(() => parseSparePartChatReply('{"type":"question","message":"  "}', 'part'))
    assert.throws(() => parseSparePartChatReply('{"type":"diagnosis","message":"?"}', 'part'))
    assert.throws(() =>
      parseSparePartChatReply('{"type":"part","partKey":42,"message":"?"}', 'part')
    )
  })
})
