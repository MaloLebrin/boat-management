import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import { buildAssistantSystemPrompt, parseAssistantReply } from '#services/assistant_prompt_service'
import { serializeToolResult } from '#services/assistant_tools_service'
import { ASSISTANT_NAV_TARGETS, type AssistantAiReply } from '#shared/types/assistant'
import { ASSISTANT_TOOL_RESULT_MAX_CHARS } from '#shared/types/assistant_tools'

const PROMPT_CTX = {
  orgName: 'Voiles du Ponant',
  todayIso: '2026-09-07',
  rosterLines: '- #1 Pen Duick | moteurs: #3 Yamaha 4AS',
  rosterTruncated: false,
  digestLines: '- 2 tâches en retard',
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
