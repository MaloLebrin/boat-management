import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import { useMockTicker } from '../../inertia/composables/use_mock_ticker'
import HomeMockGauge from '../../inertia/components/marketing/home/HomeMockGauge.vue'
import HomeMockDial from '../../inertia/components/marketing/home/HomeMockDial.vue'
import HomeMockInstruments from '../../inertia/components/marketing/home/HomeMockInstruments.vue'
import HomeMockInstrumentsHistory from '../../inertia/components/marketing/home/HomeMockInstrumentsHistory.vue'
import HomeMockAisTargets from '../../inertia/components/marketing/home/HomeMockAisTargets.vue'

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  )
  window.matchMedia = globalThis.matchMedia
}

const Probe = defineComponent({
  props: { base: { type: Number, default: 100 } },
  setup(props, { expose }) {
    const value = useMockTicker(props.base, { amplitude: 10, min: 95, max: 105, intervalMs: 1000 })
    expose({ value })
    return () => h('span', String(value.value))
  },
})

beforeEach(() => {
  vi.useFakeTimers()
  stubReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useMockTicker (#995)', () => {
  test('rend la base tant que rien n’a tourné, puis bouge sans sortir de ses bornes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const wrapper = mount(Probe)
    expect((wrapper.vm as unknown as { value: number }).value).toBe(100)

    vi.advanceTimersByTime(1000)
    const value = (wrapper.vm as unknown as { value: number }).value
    expect(value).not.toBe(100)
    expect(value).toBeGreaterThanOrEqual(95)
    expect(value).toBeLessThanOrEqual(105)

    vi.advanceTimersByTime(30_000)
    const later = (wrapper.vm as unknown as { value: number }).value
    expect(later).toBeGreaterThanOrEqual(95)
    expect(later).toBeLessThanOrEqual(105)
  })

  test('ne lance aucun minuteur sous prefers-reduced-motion', () => {
    stubReducedMotion(true)
    const wrapper = mount(Probe)
    vi.advanceTimersByTime(10_000)
    expect((wrapper.vm as unknown as { value: number }).value).toBe(100)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('arrête son minuteur au démontage', () => {
    const wrapper = mount(Probe)
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('widgets de la maquette Instruments (#995)', () => {
  const icon = defineComponent({ render: () => h('svg') })

  test('la jauge affiche la valeur arrondie et un arc proportionnel', () => {
    const wrapper = mount(HomeMockGauge, {
      props: {
        label: 'Régime',
        unit: 'tr/min',
        base: 2000,
        min: 0,
        max: 4000,
        amplitude: 0,
        tone: 'text-coral-500',
        icon,
      },
    })

    expect(wrapper.text()).toContain('2000')
    expect(wrapper.text()).toContain('Régime')
    expect(wrapper.find('.mock-arc').attributes('style')).toContain('0.5 1')
  })

  test('la jauge garde un arc minimal quand la valeur est au plancher', () => {
    const wrapper = mount(HomeMockGauge, {
      props: {
        label: 'x',
        unit: 'u',
        base: 0,
        min: 0,
        max: 10,
        amplitude: 0,
        tone: 'text-coral-500',
        icon,
      },
    })

    expect(wrapper.find('.mock-arc').attributes('style')).toContain('0.02 1')
  })

  test('le cap est une rose qui tourne en sens inverse du cap', () => {
    const wrapper = mount(HomeMockDial, {
      props: { variant: 'compass', label: 'Cap', value: '212', unit: '°', angle: 212, sway: 0 },
    })

    expect(wrapper.text()).toContain('212')
    expect(wrapper.find('.mock-rotor').attributes('style')).toContain('rotate(-212deg)')
    expect(wrapper.find('text').text()).toBe('N')
    expect(wrapper.get('[data-testid="mock-dial-degrees"]').text()).toBe('212°')
  })

  test('le vent est une flèche d’angle autour d’un bateau, sans rose', () => {
    const wrapper = mount(HomeMockDial, {
      props: {
        variant: 'wind',
        label: 'Vent apparent',
        value: '14',
        unit: 'nds',
        angle: 48,
        sway: 0,
      },
    })

    expect(wrapper.find('.mock-rotor').attributes('style')).toContain('rotate(48deg)')
    expect(wrapper.find('text').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mock-dial-degrees"]').text()).toBe('48°')
    expect(wrapper.attributes('data-variant')).toBe('wind')
  })

  test('la courbe fait avancer son flux sans changer sa taille', () => {
    const wrapper = mount(HomeMockInstrumentsHistory)
    const before = wrapper.find('polyline').attributes('points')

    vi.advanceTimersByTime(1500)
    return wrapper.vm.$nextTick().then(() => {
      const after = wrapper.find('polyline').attributes('points')
      expect(after).not.toBe(before)
      expect(after?.split(' ')).toHaveLength(before?.split(' ').length ?? 0)
    })
  })

  test('le radar AIS liste trois navires par distance, le plus proche en risque de collision', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const wrapper = mount(HomeMockAisTargets)
    const rows = wrapper.findAll('[data-testid="mock-instruments-ais-row"]')

    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Atlantis Star')
    expect(rows[0].text()).toContain('1.4 homePreview.mock.instruments.aisNm')
    expect(rows[0].text()).toContain('homePreview.mock.instruments.aisDanger')
    expect(rows[0].text()).toContain('homePreview.mock.instruments.aisCpa')
    expect(rows[1].text()).toContain('homePreview.mock.instruments.aisWatch')
    expect(rows[2].text()).toContain('homePreview.mock.instruments.aisDiverging')
    expect(rows[2].text()).not.toContain('aisDanger')
    expect(wrapper.find('.mock-radar-ping').exists()).toBe(true)
    expect(wrapper.find('.mock-radar-sweep').exists()).toBe(true)

    // Pas de +0,06 rappelés vers la base : la distance converge vers 1,58 NM.
    vi.advanceTimersByTime(1400 * 12)
    await nextTick()
    expect(rows[0].text()).toContain('1.6 ')
    expect(rows[1].text()).toContain('2.8 ')
  })

  test('la maquette complète rend tous ses widgets, le radar AIS et les trois alertes', () => {
    const wrapper = mount(HomeMockInstruments)

    expect(wrapper.findAll('[data-testid="mock-instruments-tile"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-testid="mock-instruments-alerts"] li')).toHaveLength(3)
    expect(wrapper.find('[data-testid="mock-instruments-alerts"] li').text()).toContain(
      'aisCollision'
    )
    expect(wrapper.find('[data-testid="mock-instruments-ais"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mock-history"]').exists()).toBe(true)
  })
})
