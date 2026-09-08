import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import AssistantThread from '../../inertia/components/assistant/AssistantThread.vue'
import type { AssistantStarterProps } from '../../shared/types/assistant'

/**
 * Chips de suggestions de démarrage : rendues sur fil vide uniquement, texte
 * 100 % i18n — le clic émet le libellé RENDU (c'est lui qui part comme
 * message utilisateur).
 */

const pageProps: Record<string, unknown> = {
  appT: {
    'assistant.intro': 'Posez une question sur votre flotte.',
    'assistant.thinking': 'FleetAi réfléchit…',
    'assistant.starters.overdue': 'Quelles sont les {count} tâches en retard ?',
    'assistant.starters.fleetSummary': 'Quel est l’état général de la flotte ?',
  },
  locale: 'fr',
}

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: pageProps }),
  router: { reload: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

const starters: AssistantStarterProps[] = [
  { id: 'overdue', i18nKey: 'assistant.starters.overdue', params: { count: '3' } },
  { id: 'fleetSummary', i18nKey: 'assistant.starters.fleetSummary', params: {} },
]

describe('AssistantThread — suggestions de démarrage', () => {
  test('fil vide : les chips sont rendues avec le texte i18n interpolé', () => {
    const wrapper = mount(AssistantThread, {
      props: { conversation: null, pendingMessage: null, processing: false, starters },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('Quelles sont les 3 tâches en retard ?')
    expect(buttons[1].text()).toBe('Quel est l’état général de la flotte ?')
  })

  test('le clic émet le libellé rendu comme message', async () => {
    const wrapper = mount(AssistantThread, {
      props: { conversation: null, pendingMessage: null, processing: false, starters },
    })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('starter')).toEqual([['Quelles sont les 3 tâches en retard ?']])
  })

  test('aucune chip dès qu’une conversation existe ou qu’un message part', () => {
    const conversation = {
      token: 'abc',
      status: 'active' as const,
      messages: [{ role: 'user' as const, content: 'Bonjour' }],
      pendingAction: null,
      userMessagesCount: 1,
    }
    const withConversation = mount(AssistantThread, {
      props: { conversation, pendingMessage: null, processing: false, starters },
    })
    expect(withConversation.findAll('button')).toHaveLength(0)

    const withPending = mount(AssistantThread, {
      props: { conversation: null, pendingMessage: 'Bonjour', processing: true, starters },
    })
    expect(withPending.findAll('button')).toHaveLength(0)
  })
})
