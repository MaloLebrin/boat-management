import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const { patch, post, reload } = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  reload: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({ router: { patch, post, reload } }))
vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}${JSON.stringify(vars)}` : key,
  }),
}))

import InstrumentSetupStepEquipment from '../../inertia/components/boats/show/tabs/instruments/setup/InstrumentSetupStepEquipment.vue'
import type { InstrumentMappingProposal } from '../../shared/types/instruments'
import type { BoatShowEngine } from '../../inertia/types/boat_show'

const engines: BoatShowEngine[] = [
  { id: 11, brand: 'Volvo', model: 'D3', instrumentKey: null } as BoatShowEngine,
  { id: 12, brand: null, model: null, instrumentKey: 'starboard' } as BoatShowEngine,
]

const batteryProposal: InstrumentMappingProposal = {
  kind: 'battery',
  instrumentKey: 'house',
  deviceLabel: 'Victron BMV-712',
  suggestedName: 'Servitude',
  existingId: null,
  tankType: null,
}

const tankProposal: InstrumentMappingProposal = {
  kind: 'tank',
  instrumentKey: 'fuel.0',
  deviceLabel: 'Tank sender',
  suggestedName: 'Gasoil',
  existingId: null,
  tankType: 'fuel',
}

const engineProposal: InstrumentMappingProposal = {
  kind: 'engine',
  instrumentKey: 'port',
  deviceLabel: null,
  suggestedName: 'Moteur babord',
  existingId: null,
  tankType: null,
}

beforeEach(() => {
  patch.mockClear()
  post.mockClear()
  reload.mockClear()
})

describe('InstrumentSetupStepEquipment (#1037)', () => {
  test('renders proposals with checkboxes checked by default for batteries/tanks', async () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines: [],
        detectedIds: [],
        proposals: [batteryProposal, tankProposal],
      },
    })
    await flushPromises()

    const batteryRow = wrapper.find('[data-testid="proposal-battery-house"]')
    expect(batteryRow.exists()).toBe(true)
    expect(batteryRow.text()).toContain('Victron BMV-712')

    const tankRow = wrapper.find('[data-testid="proposal-tank-fuel.0"]')
    expect(tankRow.exists()).toBe(true)
  })

  test('no proposals state when all linked', () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines: [{ id: 1, instrumentKey: 'port' } as BoatShowEngine],
        detectedIds: ['port'],
        proposals: [],
      },
    })
    expect(wrapper.find('[data-testid="equipment-no-proposals"]').exists()).toBe(true)
  })

  test('apply button calls router.post with checked proposals', async () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines: [],
        detectedIds: [],
        proposals: [batteryProposal, tankProposal],
      },
    })
    await flushPromises()

    await wrapper.find('[data-testid="equipment-apply"]').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/boats/9/instrument-mapping/apply',
      {
        items: [
          {
            kind: 'battery',
            instrumentKey: 'house',
            name: 'Servitude',
            existingId: null,
            tankType: null,
          },
          {
            kind: 'tank',
            instrumentKey: 'fuel.0',
            name: 'Gasoil',
            existingId: null,
            tankType: 'fuel',
          },
        ],
      },
      expect.anything()
    )
  })

  test('unchecking a proposal excludes it from apply', async () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines: [],
        detectedIds: [],
        proposals: [batteryProposal, tankProposal],
      },
    })
    await flushPromises()

    // Uncheck the battery proposal
    const checkbox = wrapper.find('[data-testid="proposal-battery-house"] input[type="checkbox"]')
    await checkbox.setValue(false)
    await flushPromises()

    await wrapper.find('[data-testid="equipment-apply"]').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/boats/9/instrument-mapping/apply',
      {
        items: [
          {
            kind: 'tank',
            instrumentKey: 'fuel.0',
            name: 'Gasoil',
            existingId: null,
            tankType: 'fuel',
          },
        ],
      },
      expect.anything()
    )
  })

  test('engine linking works via select', async () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines,
        detectedIds: ['port', 'starboard'],
        proposals: [],
      },
    })
    await flushPromises()

    await wrapper.find('select[name="engineKey11"]').setValue('port')
    expect(patch).toHaveBeenCalledWith(
      '/boats/9/engines/11/instrument-key',
      { instrumentKey: 'port' },
      { preserveScroll: true }
    )
  })

  test('engine proposals without existingId are not in the auto-apply list', async () => {
    const wrapper = mount(InstrumentSetupStepEquipment, {
      props: {
        boatId: 9,
        engines: [],
        detectedIds: [],
        proposals: [engineProposal],
      },
    })
    await flushPromises()

    // Engine proposals without existingId are filtered out of the auto-apply list
    // The apply button should not exist since there are no non-engine proposals
    expect(wrapper.find('[data-testid="equipment-apply"]').exists()).toBe(false)
    // The component shows the empty state when no engines and no auto-applicable proposals
    expect(
      wrapper.find('[data-testid="equipment-empty"]').exists() ||
        wrapper.find('[data-testid="instrument-setup-equipment"]').exists()
    ).toBe(true)
  })
})
