import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import AssistantPanel from '../../inertia/components/assistant/AssistantPanel.vue'

/**
 * Pied de consommation IA du panneau (#642) : la paire { used, limit } vient
 * de la prop partagée enveloppée `assistantConversation`, l'avertissement et
 * le lien facturation apparaissent au-delà de 80 %.
 */

const pageProps: Record<string, unknown> = {
  appT: {
    'assistant.subtitle': 'Copilote IA pour votre flotte',
    'assistant.close': 'Fermer l’assistant',
    'assistant.newConversation': 'Nouvelle conversation',
    'assistant.intro': 'Posez une question sur votre flotte.',
    'assistant.composerPlaceholder': 'Posez votre question…',
    'assistant.composerStart': 'Démarrer la conversation',
    'assistant.composerSend': 'Envoyer',
    'assistant.disclaimer': 'FleetAi peut se tromper.',
    'assistant.maxMessages': 'Limite atteinte.',
    'assistant.usage.line': 'IA ce mois-ci : {used} / {limit} tokens.',
    'assistant.usage.manage': 'Gérer mon abonnement',
  },
  locale: 'fr',
  currentPlan: 'pro',
  assistantConversation: {
    conversation: null,
    aiUsage: { used: 200_000, limit: 1_000_000 },
  },
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

describe('AssistantPanel — pied de consommation (#642)', () => {
  test('affiche la ligne discrète sous 80 % sans lien facturation', () => {
    pageProps.assistantConversation = {
      conversation: null,
      aiUsage: { used: 200_000, limit: 1_000_000 },
    }
    const wrapper = mount(AssistantPanel)
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('IA ce mois-ci :')
    expect(text).not.toContain('Gérer mon abonnement')
  })

  test('au-delà de 80 %, avertissement et lien vers la facturation', () => {
    pageProps.assistantConversation = {
      conversation: null,
      aiUsage: { used: 900_000, limit: 1_000_000 },
    }
    const wrapper = mount(AssistantPanel)
    expect(wrapper.text()).toContain('Gérer mon abonnement')
    const billingLink = wrapper
      .findAll('a')
      .find((a) => a.attributes('href') === '/settings/billing')
    expect(billingLink).toBeDefined()
  })

  test('aucune ligne quand la limite est illimitée (Entreprise ou BYOK)', () => {
    pageProps.assistantConversation = {
      conversation: null,
      aiUsage: { used: 900_000, limit: null },
    }
    const wrapper = mount(AssistantPanel)
    expect(wrapper.text()).not.toContain('IA ce mois-ci :')
  })
})
