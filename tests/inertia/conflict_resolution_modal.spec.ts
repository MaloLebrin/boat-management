import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import ConflictResolutionModal from '../../inertia/components/ConflictResolutionModal.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'offline.conflict.title': 'Conflict detected',
        'offline.conflict.description': 'Choose a version',
        'offline.conflict.localVersion': 'Your changes',
        'offline.conflict.serverVersion': 'Server version',
        'offline.conflict.keepLocal': 'Keep mine',
        'offline.conflict.keepServer': 'Use server',
        'navigationLog.field.windForceBeaufort': 'Wind force',
        'navigationLog.field.seaState': 'Sea state',
        'navigationLog.field.crewCount': 'Crew',
        'navigationLog.field.notes': 'Notes',
      },
      locale: 'en',
    },
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
    emits: ['click'],
  },
}))

const conflict = {
  action: {
    id: 1,
    type: 'update-navigation-log',
    url: '/boats/1/navigation-logs/5',
    method: 'patch' as const,
    payload: {
      windForceBeaufort: 5,
      seaState: 'rough',
      crewCount: 3,
      notes: 'Local note',
      _expectedUpdatedAt: '2026-06-25T10:00:00.000Z',
    },
    createdAt: '2026-06-25T10:00:00.000Z',
  },
  serverData: {
    id: 5,
    updatedAt: '2026-06-25T12:00:00.000Z',
    windForceBeaufort: 2,
    seaState: 'calm',
    crewCount: 3,
    notes: 'Server note',
  },
}

const mountModal = (props = { conflict }) =>
  mount(ConflictResolutionModal, {
    props,
    global: {
      stubs: {
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })

describe('ConflictResolutionModal', () => {
  test('renders title, description and both column headers', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Conflict detected')
    expect(wrapper.text()).toContain('Your changes')
    expect(wrapper.text()).toContain('Server version')
  })

  test('displays field rows with local and server values', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Wind force')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('Local note')
    expect(wrapper.text()).toContain('Server note')
  })

  test('emits resolve("local") when "Keep mine" is clicked', async () => {
    const wrapper = mountModal()
    const buttons = wrapper.findAll('button')
    const keepLocalBtn = buttons.find((b) => b.text().includes('Keep mine'))
    await keepLocalBtn!.trigger('click')
    expect(wrapper.emitted('resolve')).toEqual([['local']])
  })

  test('emits resolve("server") when "Use server" is clicked', async () => {
    const wrapper = mountModal()
    const buttons = wrapper.findAll('button')
    const keepServerBtn = buttons.find((b) => b.text().includes('Use server'))
    await keepServerBtn!.trigger('click')
    expect(wrapper.emitted('resolve')).toEqual([['server']])
  })

  test('does not show _expectedUpdatedAt as a field row', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).not.toContain('_expectedUpdatedAt')
    expect(wrapper.text()).not.toContain('2026-06-25T10:00')
  })
})
