import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: { appT: { 'diagnostic.common.progress': '{checked}/{total}' }, locale: 'fr' },
  }),
}))

import DiagnosticProgress from '../../inertia/components/diagnostic/DiagnosticProgress.vue'

describe('DiagnosticProgress (#515)', () => {
  test('affiche la progression x/n et la barre correspondante', () => {
    const wrapper = mount(DiagnosticProgress, { props: { checked: 3, total: 11 } })

    expect(wrapper.text()).toContain('3/11')
    const bar = wrapper.find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('3')
    expect(bar.attributes('aria-valuemax')).toBe('11')
  })

  test('un total de zéro ne divise pas par zéro', () => {
    const wrapper = mount(DiagnosticProgress, { props: { checked: 0, total: 0 } })

    expect(wrapper.find('[role="progressbar"] div').attributes('style')).toContain('width: 0%')
  })
})
