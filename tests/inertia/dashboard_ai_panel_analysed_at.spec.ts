import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${Object.values(params).join(',')})` : k,
    locale: { value: 'fr' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (v: string) => `date:${v.slice(0, 10)}` }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { currentPlan: 'pro' } }),
  router: { post: vi.fn() },
}))

import DashboardAiPanel from '../../inertia/components/dashboard/DashboardAiPanel.vue'

const stubs = {
  BaseButton: { template: '<button><slot /></button>' },
  UpgradePlanModal: { template: '<div />' },
}

test('shows the date of the last fleet analysis when one exists (#832)', () => {
  const w = mount(DashboardAiPanel, {
    props: {
      aiFleetAnalysis: [{ text: 'Vidange à prévoir' }],
      aiFleetAnalysisAt: '2026-09-20T05:00:00.000Z',
    },
    global: { stubs },
  })
  expect(w.get('[data-testid="ai-panel-analysed-at"]').text()).toContain(
    'dashboard.aiPanel.lastAnalysedAt(date:2026-09-20)'
  )
})

test('stays silent about the date when no analysis exists yet', () => {
  const w = mount(DashboardAiPanel, {
    props: { aiFleetAnalysis: null, aiFleetAnalysisAt: null },
    global: { stubs },
  })
  expect(w.find('[data-testid="ai-panel-analysed-at"]').exists()).toBe(false)
  expect(w.text()).toContain('dashboard.aiPanel.empty')
})
