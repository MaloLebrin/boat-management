import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ConflictResolutionModal from '../../inertia/components/ConflictResolutionModal.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'common.offline.conflict.title': 'Conflict detected',
        'common.offline.conflict.description': 'Choose a version',
        'common.offline.conflict.localVersion': 'Your changes',
        'common.offline.conflict.serverVersion': 'Server version',
        'common.offline.conflict.keepLocal': 'Keep mine',
        'common.offline.conflict.keepServer': 'Use server',
        'common.navigationLog.field.windForceBeaufort': 'Wind force',
        'common.navigationLog.field.seaState': 'Sea state',
        'common.navigationLog.field.crewCount': 'Crew',
        'common.navigationLog.field.notes': 'Notes',
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

// `BaseModal` verrouille le scroll du body tant qu'une modale est ouverte.
afterEach(() => {
  document.body.style.overflow = ''
})

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

  describe('accessibilité (#734)', () => {
    test('le panneau est un dialogue modal pour les technologies d’assistance', () => {
      const dialog = mountModal().get('[role="dialog"]')
      expect(dialog.attributes('aria-modal')).toBe('true')
    })

    test('le dialogue est nommé par son titre', () => {
      const wrapper = mountModal()
      const labelledBy = wrapper.get('[role="dialog"]').attributes('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      expect(wrapper.get(`#${labelledBy}`).text()).toBe('Conflict detected')
    })

    test('aucune sortie neutre : seuls les deux choix referment la modale', () => {
      const wrapper = mountModal()
      const labels = wrapper.findAll('button').map((b) => b.text())
      expect(labels).toEqual(['Use server', 'Keep mine'])
    })
  })

  describe('dark mode (#416)', () => {
    test('la modale s’appuie sur des tokens de surface, pas sur bg-white', () => {
      const html = mountModal().html()
      expect(html).toContain('bg-surface-elevated')
      expect(html).toContain('border-border')
      expect(html).not.toContain('bg-white')
    })

    test('le texte et les colonnes utilisent des tokens, pas la palette gray', () => {
      const html = mountModal().html()
      expect(html).toContain('text-fg')
      expect(html).not.toMatch(/-(gray|slate)-\d/)
      // La colonne « serveur » signalait sa différence en bleu Tailwind.
      expect(html).toContain('text-info')
    })
  })
})
