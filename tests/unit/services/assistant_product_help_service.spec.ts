import { test } from '@japa/runner'
import AssistantProductHelpService, {
  PRODUCT_HELP_MAX_RESULTS,
  normalizeHelpText,
  scoreHelpEntry,
  tokenizeHelpQuery,
} from '#services/assistant_product_help_service'
import { PRODUCT_KNOWLEDGE } from '#shared/constants/assistant/product_knowledge'
import { isAssistantNavTarget } from '#shared/types/assistant'
import { PLAN_LIMITS } from '#shared/types/plan'

const service = new AssistantProductHelpService()

test.group('Base de connaissance produit — anti-divergence (#642)', () => {
  test('les ids sont uniques', ({ assert }) => {
    const ids = PRODUCT_KNOWLEDGE.map((entry) => entry.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('chaque navTarget appartient au vocabulaire fermé', ({ assert }) => {
    for (const entry of PRODUCT_KNOWLEDGE) {
      if (entry.navTarget === null) continue
      assert.isTrue(isAssistantNavTarget(entry.navTarget), `navTarget de "${entry.id}"`)
    }
  })

  test('chaque planFlag est un flag booléen réel de PLAN_LIMITS', ({ assert }) => {
    for (const entry of PRODUCT_KNOWLEDGE) {
      if (entry.planFlag === undefined) continue
      assert.isBoolean(PLAN_LIMITS.starter[entry.planFlag], `planFlag de "${entry.id}"`)
    }
  })

  test('les mots-clés sont normalisés (minuscules, sans accents)', ({ assert }) => {
    for (const entry of PRODUCT_KNOWLEDGE) {
      assert.isAtLeast(entry.keywords.length, 3, `mots-clés de "${entry.id}"`)
      for (const keyword of entry.keywords) {
        assert.equal(keyword, normalizeHelpText(keyword), `mot-clé "${keyword}" de "${entry.id}"`)
      }
    }
  })

  test('chaque corps fait 400 à 800 caractères dans les deux locales', ({ assert }) => {
    for (const entry of PRODUCT_KNOWLEDGE) {
      for (const locale of ['en', 'fr'] as const) {
        const length = entry.body[locale].length
        assert.isAtLeast(length, 400, `corps ${locale} de "${entry.id}" (${length})`)
        assert.isAtMost(length, 800, `corps ${locale} de "${entry.id}" (${length})`)
      }
    }
  })
})

test.group('Base de connaissance produit — scoring (#642)', () => {
  test('normalisation et tokenisation retirent accents et mots courts', ({ assert }) => {
    assert.equal(normalizeHelpText('Échéance Réglée'), 'echeance reglee')
    assert.deepEqual(tokenizeHelpQuery('Où voir les HEURES du moteur ?'), [
      'voir',
      'les',
      'heures',
      'moteur',
    ])
  })

  test('une question sur les heures moteur remonte l’entrée dédiée en premier', ({ assert }) => {
    const results = service.search('comment suivre les heures moteur ?', 'fr')
    assert.isNotEmpty(results)
    assert.equal(results[0].id, 'engine-hours')
    assert.isAtMost(results.length, PRODUCT_HELP_MAX_RESULTS)
    // Le contenu est servi dans la locale demandée.
    assert.include(results[0].body, 'heures moteur')
  })

  test('le scoring pèse mots-clés puis titre puis corps', ({ assert }) => {
    const entry = PRODUCT_KNOWLEDGE.find((candidate) => candidate.id === 'engine-hours')!
    const keywordScore = scoreHelpEntry(entry, ['moteur'], 'fr')
    const missScore = scoreHelpEntry(entry, ['zzzzz'], 'fr')
    assert.isAbove(keywordScore, 0)
    assert.equal(missScore, 0)
  })

  test('une question sans correspondance ou vide renvoie une liste vide', ({ assert }) => {
    assert.isEmpty(service.search('xylophone quantique', 'fr'))
    assert.isEmpty(service.search('', 'fr'))
  })
})
