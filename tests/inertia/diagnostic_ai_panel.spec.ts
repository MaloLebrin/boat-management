import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import DiagnosticAiPanel from '../../inertia/components/diagnostic/DiagnosticAiPanel.vue'
import type { EngineDiagnosisPanelData } from '../../shared/types/ai'

const routerPost = vi.fn()
let currentPlan = 'pro'

vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({
    props: {
      appT: {
        'diagnostic.ai.title': 'Assistant IA — diagnostic de panne',
        'diagnostic.ai.disclaimer': "Ne remplace pas le manuel d'atelier.",
        'diagnostic.ai.empty': 'Décrivez les symptômes de la panne.',
        'diagnostic.ai.inputLabel': 'Symptômes ou notes',
        'diagnostic.ai.placeholder': 'Ex. : le moteur cale…',
        'diagnostic.ai.analyzeSymptoms': 'Analyser les symptômes',
        'diagnostic.ai.analyzeProgress': 'Analyser ma progression',
        'diagnostic.ai.analyzing': 'Analyse en cours…',
        'diagnostic.ai.recommendedSheet': 'Fiche recommandée',
        'diagnostic.ai.causesTitle': 'Causes probables, de la moins chère à la plus chère',
        'diagnostic.ai.nextStepTitle': 'Prochaine étape',
        'diagnostic.ai.generatedAt': 'Générée le {date}',
        'diagnostic.sheets.fuel.title': 'Alimentation essence',
      },
      locale: 'fr',
      get currentPlan() {
        return currentPlan
      },
    },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    props: ['href'],
    template: '<a :href="href"><slot /></a>',
  },
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateTime: (d: string) => `date(${d})` }),
}))

const DIAGNOSIS: EngineDiagnosisPanelData = {
  result: {
    summary: "Panne d'alimentation probable",
    recommendedSheet: 'fuel',
    causes: ['Évent fermé', 'Filtre bouché', 'Pompe HS'],
    nextStep: 'Vérifier que la poire durcit complètement',
  },
  createdAt: '2026-08-28T10:00:00.000Z',
}

function mountPanel(aiDiagnosis: EngineDiagnosisPanelData | null) {
  return mount(DiagnosticAiPanel, {
    props: { boatId: 1, engineId: 2, aiDiagnosis },
    global: { stubs: { UpgradePlanModal: true } },
  })
}

describe('DiagnosticAiPanel', () => {
  test("affiche l'état vide et le disclaimer statique sans analyse", () => {
    const text = mountPanel(null).text().replace(/\s+/g, ' ')

    expect(text).toContain('Décrivez les symptômes de la panne.')
    expect(text).toContain("Ne remplace pas le manuel d'atelier.")
  })

  test('affiche le diagnostic persisté : résumé, fiche liée, causes ordonnées, prochaine étape', () => {
    const wrapper = mountPanel(DIAGNOSIS)
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain("Panne d'alimentation probable")
    expect(text).toContain('Alimentation essence')
    expect(text).toContain('de la moins chère à la plus chère')
    expect(text).toContain('Vérifier que la poire durcit complètement')
    expect(text).toContain('date(2026-08-28T10:00:00.000Z)')

    const causes = wrapper.findAll('ol li').map((li) => li.text())
    expect(causes).toEqual(['Évent fermé', 'Filtre bouché', 'Pompe HS'])

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/boats/1/engines/2/diagnostic/sheets/fuel')
  })

  test('« Analyser les symptômes » est désactivé tant que le texte est vide, puis poste le mode symptoms', async () => {
    routerPost.mockClear()
    const wrapper = mountPanel(null)
    const [symptomsButton] = wrapper.findAll('button')

    expect(symptomsButton.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Le moteur cale après 30 secondes')
    expect(symptomsButton.attributes('disabled')).toBeUndefined()

    await symptomsButton.trigger('click')
    expect(routerPost).toHaveBeenCalledWith(
      '/ai/boats/1/engines/2/diagnosis',
      { mode: 'symptoms', symptoms: 'Le moteur cale après 30 secondes' },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('« Analyser ma progression » poste le mode progress sans exiger de texte', async () => {
    routerPost.mockClear()
    const wrapper = mountPanel(null)
    const [, progressButton] = wrapper.findAll('button')

    await progressButton.trigger('click')
    expect(routerPost).toHaveBeenCalledWith(
      '/ai/boats/1/engines/2/diagnosis',
      { mode: 'progress', notes: undefined },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test("sur plan starter, aucun POST : le modal d'upgrade s'ouvre", async () => {
    currentPlan = 'starter'
    routerPost.mockClear()
    const wrapper = mountPanel(null)
    const [, progressButton] = wrapper.findAll('button')

    await progressButton.trigger('click')
    expect(routerPost).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'UpgradePlanModal' }).attributes('open')).toBe('true')
    currentPlan = 'pro'
  })
})
