import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  router: {},
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
    locale: { value: 'fr' },
  }),
}))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatTime: (v: string) => `t:${v}`,
    formatDayMonth: (v: string) => `d:${v}`,
    formatDateTime: () => 'dt',
  }),
}))
vi.mock('vue-chartjs', () => ({
  Line: { props: ['data', 'options'], template: '<canvas />' },
}))

import InstrumentForecastPanel from '../../inertia/components/boats/show/tabs/instruments/InstrumentForecastPanel.vue'
import { parseForecast } from '../../inertia/lib/signalk/weather'
import type { WeatherForecastSnapshot } from '../../shared/types/weather'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const snapshot: WeatherForecastSnapshot = {
  fetchedAt: NOW,
  providerId: 'om',
  providerName: 'Open-Meteo',
  latitude: 43,
  longitude: 5,
  points: parseForecast([
    {
      date: new Date(NOW + 3_600_000).toISOString(),
      wind: { speedTrue: 5.14444, gust: 10.28888 },
      outside: { pressure: 101_300 },
    },
  ]),
}
const refreshButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('button').find((button) => /forecast\.(refresh|loading)/.test(button.text()))!
const base = { snapshot, error: null, loading: false, stale: false, now: NOW }

describe('InstrumentForecastPanel (#1010)', () => {
  test('affiche résumé et une courbe par mesure disponible', () => {
    const wrapper = mount(InstrumentForecastPanel, { props: base })
    expect(wrapper.find('[data-testid="forecast-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-wind"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-gust"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-wave"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="forecast-source"]').exists()).toBe(true)
  })

  test('périmé : bandeau et pas de mention de source fraîche', () => {
    const wrapper = mount(InstrumentForecastPanel, { props: { ...base, stale: true } })
    expect(wrapper.find('[data-testid="forecast-stale"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="forecast-source"]').exists()).toBe(false)
  })

  test('erreur sans cache : message d’erreur et invite vide', () => {
    const wrapper = mount(InstrumentForecastPanel, {
      props: { ...base, snapshot: null, error: 'no_provider' },
    })
    expect(wrapper.text()).toContain('instruments.forecast.error.no_provider')
    expect(wrapper.text()).not.toContain('instruments.forecast.none')
  })

  test('sans cache ni erreur : « aucune prévision »', () => {
    const wrapper = mount(InstrumentForecastPanel, { props: { ...base, snapshot: null } })
    expect(wrapper.text()).toContain('instruments.forecast.none')
  })

  test('le bouton émet refresh et se bloque pendant le chargement', async () => {
    const wrapper = mount(InstrumentForecastPanel, { props: base })
    await refreshButton(wrapper).trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    const loading = mount(InstrumentForecastPanel, { props: { ...base, loading: true } })
    expect(refreshButton(loading).attributes('disabled')).toBeDefined()
  })

  test('tout est passé : message « aucune mesure » plutôt que des courbes vides', () => {
    const wrapper = mount(InstrumentForecastPanel, {
      props: { ...base, now: NOW + 10 * 3_600_000 },
    })
    expect(wrapper.text()).toContain('instruments.forecast.empty')
  })
})
