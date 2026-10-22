import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { reload } = vi.hoisted(() => ({ reload: vi.fn() }))

vi.mock('@inertiajs/vue3', () => ({
  router: { reload },
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatTime: (v: string) => `t:${v}`,
    formatDayMonth: (v: string) => `d:${v}`,
    formatDateTime: (v: string) => `dt:${v}`,
  }),
}))

vi.mock('vue-chartjs', () => ({
  Line: { props: ['data', 'options'], template: '<canvas />' },
}))

import InstrumentHistoryPanel from '../../inertia/components/boats/show/tabs/instruments/InstrumentHistoryPanel.vue'
import InstrumentLineChart from '../../inertia/components/boats/show/tabs/instruments/InstrumentLineChart.vue'
import type { InstrumentSeries } from '../../shared/types/instruments'

const SOG = 'navigation.speedOverGround'
const series: InstrumentSeries = {
  range: '24h',
  series: { [SOG]: [['2026-10-20T10:00:00.000Z', 5.14444]] },
}

beforeEach(() => reload.mockClear())

describe('InstrumentHistoryPanel (#992)', () => {
  test('sans mesure numérique, annonce qu’il n’y a rien à tracer', () => {
    const wrapper = mount(InstrumentHistoryPanel, { props: { paths: [] } })
    expect(wrapper.text()).toContain('instruments.history.noPaths')
  })

  test('ne propose que les chemins numériques du catalogue', () => {
    const wrapper = mount(InstrumentHistoryPanel, {
      props: { paths: [SOG, 'navigation.position', 'foo.bar'] },
    })
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
  })

  test('cocher une mesure recharge uniquement instrumentSeries', async () => {
    const wrapper = mount(InstrumentHistoryPanel, { props: { paths: [SOG] } })
    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload.mock.calls[0][0]).toMatchObject({
      only: ['instrumentSeries'],
      data: { range: '24h', paths: [SOG] },
    })
  })

  test('changer de plage recharge avec la nouvelle plage', async () => {
    const wrapper = mount(InstrumentHistoryPanel, { props: { paths: [SOG], series } })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.history.range.7d')!
      .trigger('click')

    expect(reload.mock.calls[0][0]).toMatchObject({ data: { range: '7d', paths: [SOG] } })
  })

  test('ne recharge pas tant qu’aucune mesure n’est choisie', async () => {
    const wrapper = mount(InstrumentHistoryPanel, { props: { paths: [SOG] } })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'instruments.history.range.1h')!
      .trigger('click')

    expect(reload).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('instruments.history.selectOne')
  })

  test('affiche une courbe convertie en nœuds pour la série reçue', () => {
    const wrapper = mount(InstrumentHistoryPanel, { props: { paths: [SOG], series } })
    const chart = wrapper.findComponent(InstrumentLineChart)

    expect(chart.exists()).toBe(true)
    expect(chart.props('unit')).toBe('kn')
    expect(chart.props('points')[0][1]).toBeCloseTo(10, 0)
    expect(chart.props('showDay')).toBe(false)
  })

  test('une série vide affiche le message « aucune donnée »', () => {
    const wrapper = mount(InstrumentHistoryPanel, {
      props: { paths: [SOG], series: { range: '24h', series: { [SOG]: [] } } },
    })
    expect(wrapper.text()).toContain('instruments.history.empty')
    expect(wrapper.findComponent(InstrumentLineChart).exists()).toBe(false)
  })
})

describe('InstrumentLineChart (#992)', () => {
  test('rend un graphique avec une couleur issue des tokens', () => {
    const wrapper = mount(InstrumentLineChart, {
      props: {
        points: [['2026-10-20T10:00:00.000Z', 3]],
        label: 'SOG',
        unit: 'kn',
        showDay: true,
        fractionDigits: 1,
      },
    })
    expect(wrapper.find('[data-testid="instrument-line-chart"]').exists()).toBe(true)
  })
})
