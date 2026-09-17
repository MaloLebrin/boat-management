import { mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, test } from 'vitest'
import { nextTick } from 'vue'
import { vi } from 'vitest'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'
import type { PublicDiagnosisConversationProps } from '../../shared/types/public_diagnosis'
import type {
  PartSearchConversationProps,
  PublicPartSearchConversationProps,
} from '../../shared/types/spare_part_chat'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

import DiagnosisChatPanel from '../../inertia/components/marketing/diagnosis/DiagnosisChatPanel.vue'
import PartsAiChatPanel from '../../inertia/components/marketing/parts_ai/PartsAiChatPanel.vue'
import SparePartsChatPanel from '../../inertia/components/spare_parts/chat/SparePartsChatPanel.vue'

/**
 * Caractérisation des trois panneaux de chat IA (diagnostic public, recherche
 * de références publique, recherche de références de l'app) avant l'extraction
 * du composable `useChatConversation` (vague 3.5). Verte sur le code d'origine
 * comme après la migration : mode du composer, bulle optimiste, requête
 * Inertia exacte, remise à zéro en fin de visite, redémarrage local.
 */

beforeEach(() => {
  resetInertiaMock()
})

/** Options passées au dernier `router.post` — c'est là que vivent onStart/onFinish. */
function lastPostOptions(): {
  onStart: () => void
  onFinish: () => void
  preserveScroll: boolean
  only: string[]
} {
  const call = routerSpies.post.mock.calls.at(-1)
  return call![2] as never
}

/** Rejoue le cycle de vie d'une visite Inertia : onStart, puis onFinish. */
async function runVisit(step: 'start' | 'finish'): Promise<void> {
  const options = lastPostOptions()
  if (step === 'start') options.onStart()
  else options.onFinish()
  await nextTick()
}

async function submitMessage(w: VueWrapper, message: string): Promise<void> {
  await w.find('textarea[name="message"]').setValue(message)
  await w.find('form').trigger('submit')
}

const DIAGNOSIS_ONLY = ['conversation', 'quota', 'errors', 'flash']

function diagnosisConversation(
  overrides: Partial<PublicDiagnosisConversationProps> = {}
): PublicDiagnosisConversationProps {
  return {
    token: 'cafe0001',
    status: 'active',
    messages: [
      { role: 'user', content: 'Le moteur cale a chaud.' },
      { role: 'assistant', content: 'Depuis quand ?' },
    ],
    result: null,
    ...overrides,
  }
}

function publicPartsConversation(
  overrides: Partial<PublicPartSearchConversationProps> = {}
): PublicPartSearchConversationProps {
  return {
    token: 'feedface0001',
    status: 'active',
    phase: 'engine',
    messages: [
      { role: 'user', content: 'Je cherche une turbine.' },
      { role: 'assistant', content: 'Quel numero de serie ?' },
    ],
    result: null,
    identificationFailed: false,
    engine: { brand: 'Yamaha', model: null, catalogBrandSlug: 'yamaha' },
    ...overrides,
  }
}

function partsConversation(
  overrides: Partial<PartSearchConversationProps> = {}
): PartSearchConversationProps {
  return {
    token: 'beef0001',
    status: 'active',
    phase: 'engine',
    messages: [{ role: 'user', content: 'Filtre a huile ?' }],
    result: null,
    identificationFailed: false,
    ...overrides,
  }
}

const SPARE_PARTS_BASE = '/boats/7/engines/3/spare-parts/chat/conversations'

function mountSpareParts(conversation: PartSearchConversationProps | null): VueWrapper {
  return mount(SparePartsChatPanel, {
    props: {
      boatId: 7,
      engine: { id: 3, brand: 'Yamaha', model: 'F40', serialNumber: null } as never,
      conversation,
      canManage: true,
    },
  })
}

describe('DiagnosisChatPanel (diagnostic public)', () => {
  test('sans conversation, le composer demarre avec les champs de contexte', () => {
    const w = mount(DiagnosisChatPanel, {
      props: { conversation: null, quota: { used: 0, limit: 2 }, isAuthenticated: false },
    })

    expect(w.find('input[name="engineType"]').exists()).toBe(true)
    expect(w.text()).toContain('publicDiagnosis.composer_start')
  })

  test('le premier message poste le contexte, affiche la bulle optimiste puis se remet a zero', async () => {
    const w = mount(DiagnosisChatPanel, {
      props: { conversation: null, quota: { used: 0, limit: 2 }, isAuthenticated: false },
    })

    await w.find('input[name="engineType"]').setValue('inbord')
    await w.find('input[name="brand"]').setValue('Volvo')
    await w.find('input[name="hours"]').setValue('1200')
    await submitMessage(w, 'Le moteur cale a chaud.')

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/diagnosis-ai/conversations',
      { message: 'Le moteur cale a chaud.', engineType: 'inbord', brand: 'Volvo', hours: 1200 },
      expect.objectContaining({ preserveScroll: true, only: DIAGNOSIS_ONLY })
    )

    await nextTick()
    expect(w.text()).toContain('Le moteur cale a chaud.')

    await runVisit('start')
    expect(w.text()).toContain('publicDiagnosis.composer_thinking')

    await runVisit('finish')
    expect(w.text()).not.toContain('publicDiagnosis.composer_thinking')
    expect(w.text()).not.toContain('Le moteur cale a chaud.')
  })

  test('une reponse poste sur le token, sans les champs de contexte', async () => {
    const w = mount(DiagnosisChatPanel, {
      props: {
        conversation: diagnosisConversation(),
        quota: { used: 1, limit: 2 },
        isAuthenticated: false,
      },
    })

    expect(w.find('input[name="engineType"]').exists()).toBe(false)
    expect(w.text()).toContain('Depuis quand ?')

    await submitMessage(w, 'Depuis hier.')

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/diagnosis-ai/conversations/cafe0001/messages',
      { message: 'Depuis hier.' },
      expect.objectContaining({ preserveScroll: true, only: DIAGNOSIS_ONLY })
    )
  })

  test('quota epuise sans conversation : aucun composer', () => {
    const w = mount(DiagnosisChatPanel, {
      props: { conversation: null, quota: { used: 2, limit: 2 }, isAuthenticated: false },
    })

    expect(w.find('form').exists()).toBe(false)
  })

  test('conversation terminee : bouton de nouvelle conversation, qui rouvre le composer de depart', async () => {
    const w = mount(DiagnosisChatPanel, {
      props: {
        conversation: diagnosisConversation({
          status: 'completed',
          result: { summary: 'Injecteur', causes: ['a'], nextStep: 'b' },
        }),
        quota: { used: 1, limit: 2 },
        isAuthenticated: false,
      },
    })

    expect(w.find('form').exists()).toBe(false)
    expect(w.text()).toContain('publicDiagnosis.new_conversation')

    await w.find('button').trigger('click')

    expect(w.find('input[name="engineType"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Depuis quand ?')
  })
})

describe('PartsAiChatPanel (recherche de references publique)', () => {
  test('le premier message poste marque et numero de serie, avec bulle optimiste', async () => {
    const w = mount(PartsAiChatPanel, {
      props: { conversation: null, quota: { used: 0, limit: 2 }, isAuthenticated: false },
    })

    await w.find('input[name="brand"]').setValue('Yamaha')
    await w.find('input[name="serialNumber"]').setValue('6E0-S-123456')
    await submitMessage(w, 'Je cherche la turbine.')

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/parts-ai/conversations',
      { message: 'Je cherche la turbine.', brand: 'Yamaha', serialNumber: '6E0-S-123456' },
      expect.objectContaining({ preserveScroll: true, only: DIAGNOSIS_ONLY })
    )

    await runVisit('start')
    expect(w.text()).toContain('Je cherche la turbine.')
    expect(w.text()).toContain('publicPartSearch.composer_thinking')

    await runVisit('finish')
    expect(w.text()).not.toContain('publicPartSearch.composer_thinking')
  })

  test('une reponse poste sur le token, sans les champs de contexte', async () => {
    const w = mount(PartsAiChatPanel, {
      props: {
        conversation: publicPartsConversation(),
        quota: { used: 1, limit: 2 },
        isAuthenticated: false,
      },
    })

    expect(w.find('input[name="brand"]').exists()).toBe(false)
    await submitMessage(w, 'Le code plaque est 6E0.')

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/parts-ai/conversations/feedface0001/messages',
      { message: 'Le code plaque est 6E0.' },
      expect.objectContaining({ preserveScroll: true, only: DIAGNOSIS_ONLY })
    )
  })

  test('quota epuise sans conversation : aucun composer', () => {
    const w = mount(PartsAiChatPanel, {
      props: { conversation: null, quota: { used: 2, limit: 2 }, isAuthenticated: false },
    })

    expect(w.find('form').exists()).toBe(false)
  })

  test('conversation terminee : nouvelle conversation tant que le quota le permet', async () => {
    const w = mount(PartsAiChatPanel, {
      props: {
        conversation: publicPartsConversation({
          status: 'completed',
          phase: 'part',
          result: { partKey: null, reference: null },
        }),
        quota: { used: 1, limit: 2 },
        isAuthenticated: false,
      },
    })

    expect(w.text()).toContain('publicPartSearch.new_conversation')
    await w.find('button').trigger('click')
    expect(w.find('input[name="brand"]').exists()).toBe(true)

    const exhausted = mount(PartsAiChatPanel, {
      props: {
        conversation: publicPartsConversation({
          status: 'completed',
          phase: 'part',
          result: { partKey: null, reference: null },
        }),
        quota: { used: 2, limit: 2 },
        isAuthenticated: false,
      },
    })
    expect(exhausted.text()).not.toContain('publicPartSearch.new_conversation')
  })
})

describe('SparePartsChatPanel (recherche de references de l app)', () => {
  test('sans conversation : introduction et composer de depart, aucun quota', () => {
    const w = mountSpareParts(null)

    expect(w.text()).toContain('parts.ai.intro')
    expect(w.text()).toContain('parts.ai.composerStart')
  })

  test('le premier message poste sur la conversation du moteur', async () => {
    const w = mountSpareParts(null)

    await submitMessage(w, 'Filtre a huile ?')

    expect(routerSpies.post).toHaveBeenCalledWith(
      SPARE_PARTS_BASE,
      { message: 'Filtre a huile ?' },
      expect.objectContaining({
        preserveScroll: true,
        only: ['conversation', 'errors', 'flash'],
      })
    )

    await runVisit('start')
    expect(w.text()).toContain('parts.ai.thinking')

    await runVisit('finish')
    expect(w.text()).not.toContain('parts.ai.thinking')
  })

  test('une reponse poste sur le token de la conversation', async () => {
    const w = mountSpareParts(partsConversation())

    await submitMessage(w, 'Le code plaque est 6E0.')

    expect(routerSpies.post).toHaveBeenCalledWith(
      `${SPARE_PARTS_BASE}/beef0001/messages`,
      { message: 'Le code plaque est 6E0.' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('conversation terminee : le bouton de nouvelle recherche rouvre le composer de depart', async () => {
    const w = mountSpareParts(partsConversation({ status: 'completed', phase: 'part' }))

    expect(w.find('form').exists()).toBe(false)
    expect(w.text()).toContain('parts.ai.newSearch')

    await w.find('button').trigger('click')

    expect(w.text()).toContain('parts.ai.composerStart')
    expect(w.text()).toContain('parts.ai.intro')
  })
})
