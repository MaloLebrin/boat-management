import { test } from '@japa/runner'
import AssistantPlaybookService from '#services/assistant_playbook_service'
import { ASSISTANT_PLAYBOOKS } from '#shared/constants/assistant/playbooks'
import { normalizeHelpText } from '#services/assistant_product_help_service'
import { PLAN_LIMITS } from '#shared/types/plan'

const service = new AssistantPlaybookService()

const ENTERPRISE_QUOTAS = PLAN_LIMITS.enterprise
const PRO_QUOTAS = PLAN_LIMITS.pro

test.group('AssistantPlaybookService — selection par scoring', () => {
  test('une question maintenance selectionne le playbook maintenance en premier', ({ assert }) => {
    const result = service.select(
      'quand faire la vidange du moteur ?',
      null,
      ENTERPRISE_QUOTAS,
      'fr'
    )
    assert.isNotEmpty(result)
    assert.equal(result[0].id, 'maintenance')
  })

  test('bonus de page: message neutre + page reservations -> commercial selectionne quand canManageReservations true', ({
    assert,
  }) => {
    const resultWith = service.select('aide-moi', '/reservations', ENTERPRISE_QUOTAS, 'fr')
    assert.isTrue(resultWith.some((p) => p.id === 'commercial'))
  })

  test('bonus de page: commercial exclu quand canManageReservations false', ({ assert }) => {
    const resultWithout = service.select('aide-moi', '/reservations', PRO_QUOTAS, 'fr')
    assert.isFalse(resultWithout.some((p) => p.id === 'commercial'))
  })

  test('au maximum 2 playbooks sont renvoyes quel que soit le message', ({ assert }) => {
    const result = service.select(
      'maintenance navigation fuel security port reservation billing plan',
      '/planning',
      ENTERPRISE_QUOTAS,
      'fr'
    )
    assert.isAtMost(result.length, 2)
  })

  test('message vide sans page renvoie une liste vide', ({ assert }) => {
    const result = service.select('', null, ENTERPRISE_QUOTAS, 'fr')
    assert.isEmpty(result)
  })

  test('deux appels identiques donnent le meme resultat (determinisme)', ({ assert }) => {
    const msg = 'quand faire la vidange du moteur ?'
    const first = service.select(msg, '/planning', ENTERPRISE_QUOTAS, 'fr')
    const second = service.select(msg, '/planning', ENTERPRISE_QUOTAS, 'fr')
    assert.deepEqual(
      first.map((p) => p.id),
      second.map((p) => p.id)
    )
  })
})

test.group('AssistantPlaybookService — garde-fous du contenu', () => {
  test('les ids de playbooks sont tous uniques', ({ assert }) => {
    const ids = ASSISTANT_PLAYBOOKS.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('tous les keywords sont en minuscules sans accents', ({ assert }) => {
    for (const playbook of ASSISTANT_PLAYBOOKS) {
      for (const kw of playbook.keywords) {
        assert.equal(
          kw,
          normalizeHelpText(kw),
          `keyword "${kw}" du playbook "${playbook.id}" n'est pas normalise`
        )
        assert.equal(kw, kw.toLowerCase(), `keyword "${kw}" contient des majuscules`)
      }
    }
  })

  test('le body de chaque playbook fait au plus 900 caracteres par locale', ({ assert }) => {
    for (const playbook of ASSISTANT_PLAYBOOKS) {
      for (const locale of ['fr', 'en'] as const) {
        assert.isAtMost(
          playbook.body[locale].length,
          900,
          `body ${locale} du playbook "${playbook.id}" depasse 900 chars`
        )
      }
    }
  })

  test('buildPromptSection renvoie null sur un tableau vide', ({ assert }) => {
    const result = service.buildPromptSection([], 'fr')
    assert.isNull(result)
  })

  test('buildPromptSection renvoie une section non-nulle sur un tableau non vide', ({ assert }) => {
    const playbooks = ASSISTANT_PLAYBOOKS.slice(0, 1)
    const section = service.buildPromptSection(playbooks, 'fr')
    assert.isNotNull(section)
    assert.include(section!, 'expert')
  })
})
