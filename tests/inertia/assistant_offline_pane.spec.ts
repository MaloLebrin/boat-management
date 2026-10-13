import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// #971 — le panneau du copilote sans réseau : bandeau, aide locale, questions en attente.

vi.mock('vue-sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

const net = vi.hoisted(() => ({ state: { value: 'offline' } as { value: string } }))
vi.mock('~/composables/use_connectivity', () => ({ connectivityState: () => net.state }))

const pageProps: Record<string, unknown> = {
  appT: {
    'assistant.subtitle': 'Copilote IA pour votre flotte',
    'assistant.close': 'Fermer l’assistant',
    'assistant.offline.banner': 'Mode hors-ligne — réponses limitées',
    'assistant.offline.intro': 'Pas de réseau : aide embarquée.',
    'assistant.offline.introHelpOnly': 'Aide embarquée seulement.',
    'assistant.offline.queued': 'Question gardée pour le retour du réseau.',
    'assistant.offline.askLater': 'Poser aussi à l’assistant au retour du réseau',
    'assistant.offline.pendingTitle': '{count} question(s) en attente',
    'assistant.offline.remove': 'Retirer',
    'assistant.upsell.title': 'Passez au plan Pro',
    'assistant.sources.product': 'Aide FleetAi',
  },
  locale: 'fr',
  currentPlan: 'pro',
  flash: {},
}

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ url: '/dashboard', props: pageProps }),
  router: { reload: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

import AssistantPanel from '../../inertia/components/assistant/AssistantPanel.vue'
import { resetAssistantOffline } from '../../inertia/composables/use_assistant_offline'

async function askInPanel(wrapper: ReturnType<typeof mount>, question: string) {
  await wrapper.find('textarea[name="message"]').setValue(question)
  await wrapper.find('form').trigger('submit')
  // La base produit est chargée en import dynamique à la première question.
  await vi.waitFor(() => expect(wrapper.findAll('.rounded-2xl')).toHaveLength(2))
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  net.state.value = 'offline'
  pageProps.currentPlan = 'pro'
  resetAssistantOffline()
})

describe('AssistantPanel hors-ligne (#971)', () => {
  test('affiche le bandeau « réponses limitées » à la place du fil serveur', () => {
    const wrapper = mount(AssistantPanel)
    const banner = wrapper.get('[data-testid="assistant-offline-banner"]')
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toBe('Mode hors-ligne — réponses limitées')
    expect(wrapper.text()).toContain('Pas de réseau : aide embarquée.')
  })

  test('en ligne, le panneau habituel revient', () => {
    net.state.value = 'online'
    const wrapper = mount(AssistantPanel)
    expect(wrapper.find('[data-testid="assistant-offline-banner"]').exists()).toBe(false)
  })

  test('répond depuis l’aide locale, avec le badge de source et la proposition de reposer', async () => {
    const wrapper = mount(AssistantPanel)

    await askInPanel(wrapper, 'comment déclarer un incident')

    expect(wrapper.text()).toContain('Aide FleetAi')
    const askLater = wrapper.get('[data-testid="assistant-ask-later"]')
    await askLater.trigger('click')
    expect(wrapper.find('[data-testid="assistant-ask-later"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="assistant-pending-question"]')).toHaveLength(1)
  })

  test('une question sans réponse locale rejoint la liste d’attente, retirable', async () => {
    const wrapper = mount(AssistantPanel)

    await askInPanel(wrapper, 'xyzzy plugh')

    expect(wrapper.text()).toContain('Question gardée pour le retour du réseau.')
    const pending = wrapper.findAll('[data-testid="assistant-pending-question"]')
    expect(pending).toHaveLength(1)
    expect(pending[0].text()).toContain('xyzzy plugh')
    expect(wrapper.text()).toContain('1 question(s) en attente')

    await pending[0].get('button').trigger('click')
    expect(wrapper.findAll('[data-testid="assistant-pending-question"]')).toHaveLength(0)
  })

  test('plan Starter : l’aide locale reste accessible hors-ligne, sans upsell', () => {
    pageProps.currentPlan = 'starter'
    const wrapper = mount(AssistantPanel)
    expect(wrapper.text()).toContain('Aide embarquée seulement.')
    expect(wrapper.text()).not.toContain('Passez au plan Pro')
  })
})
