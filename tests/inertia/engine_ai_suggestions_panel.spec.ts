import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import EngineAiSuggestionsPanel from '../../inertia/components/engine/show/EngineAiSuggestionsPanel.vue'

const routerPost = vi.fn()
let currentPlan = 'pro'

vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({
    props: {
      appT: {
        'boats.engineShow.overview.aiTitle': 'Assistant IA',
        'boats.engineShow.overview.aiEmpty': "Cliquez sur 'Actualiser' pour des suggestions IA.",
        'boats.engineShow.overview.aiRefresh': 'Actualiser',
        'boats.engineShow.overview.aiRefreshing': 'Analyse...',
      },
      locale: 'fr',
      currentPlan,
    },
  }),
}))

function mountPanel(aiSuggestions: { text: string }[] | null) {
  return mount(EngineAiSuggestionsPanel, {
    props: { boatId: 4, engineId: 7, aiSuggestions },
    global: { stubs: { UpgradePlanModal: true } },
  })
}

describe('EngineAiSuggestionsPanel', () => {
  beforeEach(() => {
    routerPost.mockClear()
    currentPlan = 'pro'
  })

  test("affiche l'état vide pour null comme pour [] (#478)", () => {
    expect(mountPanel(null).text()).toContain("Cliquez sur 'Actualiser'")
    expect(mountPanel([]).text()).toContain("Cliquez sur 'Actualiser'")
  })

  test('affiche les suggestions quand la liste est remplie', () => {
    const text = mountPanel([{ text: 'Vidange à planifier — 490h atteintes' }]).text()

    expect(text).toContain('Vidange à planifier — 490h atteintes')
    expect(text).not.toContain("Cliquez sur 'Actualiser'")
  })

  test('le bouton Actualiser poste sur la route suggestions du moteur', async () => {
    const wrapper = mountPanel([])

    await wrapper.find('button').trigger('click')

    expect(routerPost).toHaveBeenCalledWith(
      '/ai/boats/4/engines/7/suggestions',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test("un plan starter ouvre la modale d'upgrade au lieu de poster", async () => {
    currentPlan = 'starter'
    const wrapper = mountPanel([])

    await wrapper.find('button').trigger('click')

    expect(routerPost).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'UpgradePlanModal' }).attributes('open')).toBe('true')
  })
})
