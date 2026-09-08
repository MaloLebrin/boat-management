import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import {
  buildActionLines,
  buildAssistantSystemPrompt,
  parseAssistantReply,
} from '#services/assistant_prompt_service'
import { serializeToolResult } from '#services/assistant_tools_service'
import {
  ASSISTANT_ACTION_KINDS,
  ASSISTANT_NAV_TARGETS,
  type AssistantAiReply,
} from '#shared/types/assistant'
import { ASSISTANT_TOOL_RESULT_MAX_CHARS } from '#shared/types/assistant_tools'
import { AiInvalidResponseError } from '#exceptions/ai_errors'

const PROMPT_CTX = {
  orgName: 'Voiles du Ponant',
  todayIso: '2026-09-07',
  rosterLines: '- #1 Pen Duick | moteurs: #3 Yamaha 4AS',
  rosterTruncated: false,
  digestLines: '- 2 tâches en retard',
  actionLines: buildActionLines([...ASSISTANT_ACTION_KINDS], 'fr'),
  pageLine: null,
  playbookSection: null,
  customPrompt: null,
}

test.group('Assistant — prompt système (#642)', () => {
  test('le prompt porte les trois sources, les outils et le vocabulaire de navigation', ({
    assert,
  }) => {
    for (const locale of ['fr', 'en'] as const) {
      const prompt = buildAssistantSystemPrompt(locale, PROMPT_CTX)
      assert.include(prompt, 'search_product_help')
      assert.include(prompt, '"source"')
      assert.include(prompt, '1500')
      // Le vocabulaire fermé des cibles est énuméré au modèle.
      for (const target of Object.keys(ASSISTANT_NAV_TARGETS)) {
        assert.include(prompt, target)
      }
    }
  })
})

test.group('Assistant — parse de la réponse (#642)', () => {
  test('answer garde un source et un navTarget valides', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'answer',
        message: 'Le moteur totalise 220 heures.',
        source: 'fleet_data',
        navTarget: 'engines.index',
      })
    ) as Extract<AssistantAiReply, { type: 'answer' }>
    assert.equal(reply.source, 'fleet_data')
    assert.equal(reply.navTarget, 'engines.index')
  })

  test('un source ou un navTarget inconnu est ignoré plutôt que fatal', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'answer',
        message: 'Réponse.',
        source: 'wikipedia',
        navTarget: 'admin.secret',
      })
    ) as Extract<AssistantAiReply, { type: 'answer' }>
    assert.equal(reply.type, 'answer')
    assert.isUndefined(reply.source)
    assert.isUndefined(reply.navTarget)
  })

  test('un navTarget null est ignoré (forme des exemples du prompt)', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({ type: 'answer', message: 'Réponse.', source: 'general', navTarget: null })
    ) as Extract<AssistantAiReply, { type: 'answer' }>
    assert.equal(reply.source, 'general')
    assert.isUndefined(reply.navTarget)
  })
})

test.group('Assistant — cibles de navigation (#642)', () => {
  // La correspondance cible ↔ route réelle du routeur est vérifiée côté
  // fonctionnel (`assistant_tools.spec.ts`) : le routeur n'est pas commité
  // dans la suite unit.
  test('chaque i18nKey existe dans les deux locales', async ({ assert }) => {
    for (const locale of ['en', 'fr'] as const) {
      const translations = JSON.parse(
        await readFile(
          new URL(`../../../resources/lang/${locale}/assistant.json`, import.meta.url),
          'utf8'
        )
      ) as Record<string, unknown>
      const navTargets = translations.navTargets as Record<string, string>
      for (const { i18nKey } of Object.values(ASSISTANT_NAV_TARGETS)) {
        const leaf = i18nKey.split('.').at(-1) as string
        assert.isString(navTargets[leaf], `${i18nKey} manquante en ${locale}`)
      }
    }
  })
})

test.group('Assistant — troncature des résultats d’outils (#642)', () => {
  test('un résultat court passe tel quel, un résultat long est tronqué avec truncated: true', ({
    assert,
  }) => {
    assert.equal(serializeToolResult({ total: 2 }), '{"total":2}')

    const big = { rows: 'x'.repeat(ASSISTANT_TOOL_RESULT_MAX_CHARS * 2) }
    const serialized = serializeToolResult(big)
    const parsed = JSON.parse(serialized) as { truncated: boolean; preview: string }
    assert.isTrue(parsed.truncated)
    assert.equal(parsed.preview.length, ASSISTANT_TOOL_RESULT_MAX_CHARS)
  })
})

test.group('Assistant — parseProposedAction formes heureuses', () => {
  test('add_engine_hours est parse correctement', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'propose_action',
        message: 'Ajouter 22 heures ?',
        action: { kind: 'add_engine_hours', boatId: 1, engineId: 3, incrementBy: 22 },
      })
    ) as Extract<AssistantAiReply, { type: 'propose_action' }>
    assert.equal(reply.type, 'propose_action')
    assert.equal(reply.action.kind, 'add_engine_hours')
    if (reply.action.kind === 'add_engine_hours') {
      assert.equal(reply.action.boatId, 1)
      assert.equal(reply.action.engineId, 3)
      assert.equal(reply.action.incrementBy, 22)
    }
  })

  test('log_fuel est parse avec tous ses champs optionnels', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'propose_action',
        message: 'Enregistrer le plein ?',
        action: {
          kind: 'log_fuel',
          boatId: 1,
          fueledAt: '2026-09-07',
          quantityLiters: 80,
          pricePerLiter: 1.85,
          totalCost: null,
          boatEngineId: null,
          fuelType: 'diesel',
          supplier: null,
          notes: null,
        },
      })
    ) as Extract<AssistantAiReply, { type: 'propose_action' }>
    assert.equal(reply.action.kind, 'log_fuel')
    if (reply.action.kind === 'log_fuel') {
      assert.equal(reply.action.quantityLiters, 80)
      assert.equal(reply.action.pricePerLiter, 1.85)
      assert.equal(reply.action.fuelType, 'diesel')
    }
  })
})

test.group('Assistant — parseProposedAction erreurs de validation', () => {
  test('kind inconnu leve AiInvalidResponseError', ({ assert }) => {
    assert.throws(
      () =>
        parseAssistantReply(
          JSON.stringify({
            type: 'propose_action',
            message: 'Faire quelque chose',
            action: { kind: 'fly_to_moon', boatId: 1 },
          })
        ),
      AiInvalidResponseError
    )
  })

  test('report_incident avec incidentType inconnu leve AiInvalidResponseError', ({ assert }) => {
    assert.throws(
      () =>
        parseAssistantReply(
          JSON.stringify({
            type: 'propose_action',
            message: 'Incident',
            action: {
              kind: 'report_incident',
              boatId: 1,
              occurredAt: '2026-09-07T10:00',
              incidentType: 'alien_attack',
              location: null,
              description: 'Weird stuff happened',
            },
          })
        ),
      AiInvalidResponseError
    )
  })

  test('set_part_stock avec newStock negatif leve AiInvalidResponseError', ({ assert }) => {
    assert.throws(
      () =>
        parseAssistantReply(
          JSON.stringify({
            type: 'propose_action',
            message: 'Stock ?',
            action: { kind: 'set_part_stock', boatId: 1, engineId: 3, partId: 7, newStock: -1 },
          })
        ),
      AiInvalidResponseError
    )
  })

  test('une date que Luxon rejette leve AiInvalidResponseError meme si Date.parse l accepte', ({
    assert,
  }) => {
    // `Date.parse` accepte ces deux formes ; `DateTime.fromISO` non. Les
    // laisser passer stockerait une proposition qui casse a la confirmation.
    for (const departedAt of ['2026-09-07 14:30', '07/09/2026']) {
      assert.throws(
        () =>
          parseAssistantReply(
            JSON.stringify({
              type: 'propose_action',
              message: 'Sortie',
              action: {
                kind: 'start_trip',
                boatId: 1,
                departedAt,
                departurePortName: null,
                engineHoursStart: null,
                crewCount: null,
                notes: null,
              },
            })
          ),
        AiInvalidResponseError
      )
    }
  })

  test('une date ISO valide passe', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'propose_action',
        message: 'Sortie',
        action: {
          kind: 'start_trip',
          boatId: 1,
          departedAt: '2026-09-07T14:30',
          departurePortName: 'Camaret',
          engineHoursStart: null,
          crewCount: null,
          notes: null,
        },
      })
    )
    assert.equal(reply.type, 'propose_action')
    if (reply.type === 'propose_action' && reply.action.kind === 'start_trip') {
      assert.equal(reply.action.departedAt, '2026-09-07T14:30')
    }
  })

  test('log_fuel sans quantityLiters leve AiInvalidResponseError', ({ assert }) => {
    assert.throws(
      () =>
        parseAssistantReply(
          JSON.stringify({
            type: 'propose_action',
            message: 'Plein',
            action: {
              kind: 'log_fuel',
              boatId: 1,
              fueledAt: '2026-09-07',
              quantityLiters: null,
              pricePerLiter: null,
              totalCost: null,
              boatEngineId: null,
              fuelType: null,
              supplier: null,
              notes: null,
            },
          })
        ),
      AiInvalidResponseError
    )
  })
})

test.group('Assistant — alias propose_task', () => {
  test('propose_task est mappe sur propose_action + kind create_task', ({ assert }) => {
    const reply = parseAssistantReply(
      JSON.stringify({
        type: 'propose_task',
        message: 'Planifier la vidange ?',
        task: {
          boatId: 1,
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
    ) as Extract<AssistantAiReply, { type: 'propose_action' }>
    assert.equal(reply.type, 'propose_action')
    assert.equal(reply.action.kind, 'create_task')
    if (reply.action.kind === 'create_task') {
      assert.equal(reply.action.boatId, 1)
      assert.equal(reply.action.title, 'Oil change')
    }
  })
})

test.group('Assistant — buildActionLines', () => {
  test('buildActionLines([]) contient la note aucune action', ({ assert }) => {
    const lines = buildActionLines([], 'fr')
    assert.include(lines, 'aucune action')
  })

  test("buildActionLines(['create_task']) ne mentionne pas add_engine_hours", ({ assert }) => {
    const lines = buildActionLines(['create_task'], 'fr')
    assert.notInclude(lines, 'add_engine_hours')
    assert.include(lines, 'create_task')
  })
})

test.group('Assistant — buildAssistantSystemPrompt pageLine et playbookSection', () => {
  test('un pageLine non-null injecte Page courante dans le prompt', ({ assert }) => {
    const prompt = buildAssistantSystemPrompt('fr', {
      ...PROMPT_CTX,
      pageLine: 'Fiche du bateau Mistral II (#1)',
    })
    assert.include(prompt, 'Page courante')
    assert.include(prompt, 'Fiche du bateau Mistral II (#1)')
  })

  test('un pageLine null n ajoute pas de section Page courante', ({ assert }) => {
    const prompt = buildAssistantSystemPrompt('fr', { ...PROMPT_CTX, pageLine: null })
    assert.notInclude(prompt, 'Page courante')
  })

  test('un playbookSection non-null est injecte dans le prompt', ({ assert }) => {
    const section = 'Reperes expert pour cette demande :\n[Maintenance] Faire la vidange.'
    const prompt = buildAssistantSystemPrompt('fr', { ...PROMPT_CTX, playbookSection: section })
    assert.include(prompt, 'Reperes expert')
    assert.include(prompt, 'Faire la vidange')
  })

  test('un playbookSection null n ajoute pas de section Reperes', ({ assert }) => {
    const prompt = buildAssistantSystemPrompt('fr', { ...PROMPT_CTX, playbookSection: null })
    assert.notInclude(prompt, 'Reperes expert')
  })
})
