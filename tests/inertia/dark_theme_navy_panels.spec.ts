import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

/**
 * Thème sombre (#457) — les deux blocs que la campagne du 03/08 a trouvés
 * inversés à l'envers.
 *
 * `theme_safe_components.spec.ts` scanne le **source** et interdit qu'une couleur
 * figée réapparaisse. Ces tests-ci montent les composants et vérifient le rendu
 * effectif : quelle classe porte réellement le panneau et l'en-tête de colonne.
 * Un scan de source ne dirait pas si un `:class` conditionnel a reconduit le
 * mauvais token dans une branche.
 */

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en', currentPlan: 'pro' } }),
  router: { post: vi.fn() },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button v-bind="$attrs"><slot /></button>' },
}))

vi.mock('~/components/base/UpgradePlanModal.vue', () => ({
  default: { template: '<div />', props: ['open', 'feature'] },
}))

import DashboardAiPanel from '../../inertia/components/dashboard/DashboardAiPanel.vue'
import PlanningKanban from '../../inertia/components/planning/PlanningKanban.vue'

/**
 * Les paliers navy que `[data-theme='dark']` ne réinverse pas et qui, posés en
 * fond ou en encre sur une surface qui bascule, figent un bloc clair.
 */
const NAVY_AT_ODDS_WITH_ITS_ROLE =
  /\b(?:bg|from|via|to)-navy-(?:25|50|100|200)\b|\b(?:text|border|ring)-navy-(?:600|700|800|900)\b/

describe('Assistant IA du dashboard · panneau navy permanent', () => {
  test('repose sur un aplat navy, pas sur `surface-inverse`', () => {
    const w = mount(DashboardAiPanel, { props: { aiFleetAnalysis: null } })
    const panel = w.get('div')

    expect(panel.classes()).toContain('bg-navy-800')
    // `surface-inverse` / `fg-inverse` désignent « la surface à contre-emploi du
    // thème courant » : en sombre ils virent au blanc. C'était la cause du bug.
    // On interroge les classes rendues plutôt que le HTML brut : les commentaires
    // du SFC, qui nomment ces tokens pour expliquer le correctif, y survivent.
    expect(panel.classes()).not.toContain('bg-surface-inverse')
    expect(w.findAll('[class*="fg-inverse"]')).toEqual([])
  })

  test('les suggestions sont des chips navy, pas des chips brand', () => {
    const w = mount(DashboardAiPanel, {
      props: { aiFleetAnalysis: [{ text: 'Vidange moteur bâbord' }] },
    })

    const chip = w.get('.rounded-lg.bg-navy-700')
    expect(chip.text()).toBe('Vidange moteur bâbord')
    // `brand` s'éclaircit en sombre : sur un panneau navy permanent, les chips
    // viraient au bleu pâle.
    expect(w.findAll('[class*="brand"]')).toEqual([])
  })

  test('le bouton d’analyse reste clair sur le panneau', () => {
    const w = mount(DashboardAiPanel, { props: { aiFleetAnalysis: null } })
    expect(w.get('button').classes()).toEqual(
      expect.arrayContaining(['bg-white!', 'text-navy-900!'])
    )
  })
})

describe('Kanban planning · en-têtes de colonne', () => {
  const props = {
    overdueTasks: [],
    soonTasks: [],
    plannedTasks: [],
    undatedTasks: [],
    doneTasks: [],
    doneTasksTotal: 0,
    groups: [],
    groupingEnabled: false,
    dismissedGroupIds: new Set<string>(),
  }

  function headers() {
    const w = mount(PlanningKanban, { props })
    return w.findAll('.border-l-4')
  }

  test('la colonne « Planifiées » bascule comme les quatre autres', () => {
    const planned = headers().find((h) => h.text().includes('planning.kanban.planned'))

    expect(planned).toBeDefined()
    expect(planned!.classes()).toContain('bg-brand-soft')
    expect(planned!.classes()).toContain('border-brand')
    expect(planned!.get('h2').classes()).toContain('text-brand')

    // La pastille de comptage : `on-brand` bascule en encre foncée quand le
    // brand s'éclaircit, là où `text-white` serait passé sous le seuil AA.
    const badge = planned!.get('span')
    expect(badge.classes()).toContain('bg-brand')
    expect(badge.classes()).toContain('text-on-brand')
  })

  test('aucun en-tête ne fige un palier navy à contre-rôle', () => {
    const offenders = headers()
      .map((h) => h.html())
      .filter((html) => NAVY_AT_ODDS_WITH_ITS_ROLE.test(html))

    expect(offenders, 'ces en-têtes resteront clairs en thème sombre').toEqual([])
  })

  test('les cinq colonnes sont bien couvertes', () => {
    expect(headers()).toHaveLength(5)
  })
})
