import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  router: { patch: vi.fn() },
}))

import DiagnosticSheetContent from '../../inertia/components/diagnostic/DiagnosticSheetContent.vue'
import { DIAGNOSTIC_SHEETS } from '../../shared/constants/diagnostic/diagnostic_content'

function mountSheet(slug: keyof typeof DIAGNOSTIC_SHEETS) {
  return mount(DiagnosticSheetContent, {
    props: {
      sheet: DIAGNOSTIC_SHEETS[slug],
      checkedKeys: new Set<string>(),
      canManage: true,
      boatId: 1,
      engineId: 2,
    },
  })
}

describe('DiagnosticSheetContent (#515)', () => {
  test('le rappel « jamais à sec » est présent sur une fiche qui démarre le moteur', () => {
    const wrapper = mountSheet('ignition')

    expect(wrapper.text()).toContain('diagnostic.common.neverDry')
  })

  test("le rappel est absent d'une fiche qui ne démarre pas le moteur", () => {
    const wrapper = mountSheet('compression')

    expect(wrapper.text()).not.toContain('diagnostic.common.neverDry')
  })

  test('les avertissements ⚠️ de la fiche sont rendus', () => {
    const wrapper = mountSheet('timing')

    expect(wrapper.text()).toContain('diagnostic.sheets.timing.warnings.max_advance')
  })

  test('les sections titrées de la fiche essence sont rendues avec leurs étapes', () => {
    const wrapper = mountSheet('fuel')

    expect(wrapper.text()).toContain('diagnostic.sheets.fuel.sections.tank.title')
    expect(wrapper.text()).toContain('diagnostic.sheets.fuel.steps.black_hose_only.label')
  })

  test('les tableaux de symptômes sont rendus', () => {
    const wrapper = mountSheet('fuel')

    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      'diagnostic.sheets.fuel.tables.carb_symptoms.rows.choke_only.symptom'
    )
  })
})
