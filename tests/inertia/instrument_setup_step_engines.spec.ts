import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock('@inertiajs/vue3', () => ({ router: { patch } }))
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

import InstrumentSetupStepEngines from '../../inertia/components/boats/show/tabs/instruments/setup/InstrumentSetupStepEngines.vue'

const engines = [
  { id: 11, brand: 'Volvo', model: 'D3', instrumentKey: null },
  { id: 12, brand: null, model: null, instrumentKey: 'starboard' },
] as never

beforeEach(() => patch.mockClear())

describe('InstrumentSetupStepEngines (#1023)', () => {
  test('relier un moteur : PATCH sur la bonne URL avec { instrumentKey }', async () => {
    const wrapper = mount(InstrumentSetupStepEngines, {
      props: { boatId: 9, engines, detectedIds: ['port', 'starboard'] },
    })
    await wrapper.find('select[name="engineKey11"]').setValue('port')
    expect(patch).toHaveBeenCalledWith(
      '/boats/9/engines/11/instrument-key',
      { instrumentKey: 'port' },
      { preserveScroll: true }
    )
  })

  test('détacher : instrumentKey null ; l’identifiant déjà relié reste proposé', async () => {
    const wrapper = mount(InstrumentSetupStepEngines, {
      props: { boatId: 9, engines, detectedIds: [] },
    })
    const select = wrapper.find('select[name="engineKey12"]')
    expect(select.findAll('option').map((option) => option.attributes('value'))).toContain(
      'starboard'
    )
    await select.setValue('')
    expect(patch).toHaveBeenCalledWith(
      '/boats/9/engines/12/instrument-key',
      { instrumentKey: null },
      { preserveScroll: true }
    )
    expect(wrapper.text()).toContain('instruments.setup.engines.noneDetected')
    expect(wrapper.text()).toContain('instruments.setup.engines.fallback{"id":12}')
  })

  test('bateau sans moteur : étape passable', () => {
    const wrapper = mount(InstrumentSetupStepEngines, {
      props: { boatId: 9, engines: [], detectedIds: ['port'] },
    })
    expect(wrapper.text()).toContain('instruments.setup.engines.none')
    expect(wrapper.find('select').exists()).toBe(false)
  })
})
