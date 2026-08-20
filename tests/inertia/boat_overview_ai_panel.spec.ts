import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatOverviewAiPanel from '../../inertia/components/boats/show/tabs/overview/BoatOverviewAiPanel.vue'

vi.mock('@inertiajs/vue3', () => ({
  router: { post: vi.fn() },
  usePage: () => ({
    props: {
      appT: {
        'boats.show.overview.aiEmpty': "Cliquez sur 'Actualiser' pour des suggestions IA.",
        'boats.show.overview.aiTitle': 'Assistant IA',
        'boats.show.overview.aiRefresh': 'Actualiser',
        'boats.show.overview.aiRefreshing': 'Analyse en cours…',
      },
      locale: 'fr',
      currentPlan: 'pro',
    },
  }),
}))

function panelText(aiSuggestions: { text: string }[] | null): string {
  const wrapper = mount(BoatOverviewAiPanel, {
    props: { boatId: 1, aiSuggestions },
    global: { stubs: { UpgradePlanModal: true } },
  })
  return wrapper.text().replace(/\s+/g, ' ')
}

describe('BoatOverviewAiPanel', () => {
  test("affiche l'état vide quand aucune analyse n'existe (null)", () => {
    expect(panelText(null)).toContain("Cliquez sur 'Actualiser'")
  })

  test("affiche l'état vide pour une liste vide — forme envoyée par le backend depuis #478", () => {
    // Le contrôleur ne renvoie plus `null` (le serializer Inertia jette sur un
    // prop différé null) : « aucune analyse » arrive désormais en `[]`.
    expect(panelText([])).toContain("Cliquez sur 'Actualiser'")
  })

  test('affiche les suggestions quand la liste est remplie', () => {
    const text = panelText([{ text: 'Vérifier l’anode du moteur' }])

    expect(text).toContain('Vérifier l’anode du moteur')
    expect(text).not.toContain("Cliquez sur 'Actualiser'")
  })
})
