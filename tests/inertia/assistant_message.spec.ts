import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import AssistantMessage from '../../inertia/components/assistant/AssistantMessage.vue'
import type { AssistantMessage as AssistantMessageType } from '../../shared/types/assistant'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'assistant.chatYou': 'Vous',
        'assistant.chatAssistant': 'FleetAi',
        'assistant.taskCreated.title': 'Tâche créée pour {boat}',
        'assistant.taskCreated.dueHours': 'Échéance à {hours} heures moteur',
        'assistant.taskCreated.viewPlanning': 'Voir dans le planning',
        'assistant.taskDismissed': 'Proposition refusée.',
        'assistant.handoff.diagnosis': 'Ouvrir le diagnostic pour {engine} ({boat})',
        'assistant.handoff.partSearch': 'Chercher une pièce pour {engine} ({boat})',
      },
      locale: 'fr',
    },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    name: 'MockInertiaLink',
    props: { href: { type: String, required: false } },
    template: '<a :href="href"><slot /></a>',
  },
}))

function mountMessage(message: AssistantMessageType) {
  return mount(AssistantMessage, { props: { message } })
}

describe('AssistantMessage', () => {
  test('affiche une bulle utilisateur', () => {
    const text = mountMessage({ role: 'user', content: 'Bonjour' }).text()
    expect(text).toContain('Vous')
    expect(text).toContain('Bonjour')
  })

  test('affiche la carte de tâche créée via i18n, jamais du texte LLM', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: '',
      card: {
        kind: 'task_created',
        taskId: 12,
        boatName: 'Mistral II',
        title: 'Vidange moteur',
        dueAt: null,
        dueEngineHours: 250,
      },
    })
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Tâche créée pour Mistral II')
    expect(text).toContain('Vidange moteur')
    expect(text).toContain('Échéance à 250 heures moteur')
    expect(wrapper.find('a').attributes('href')).toBe('/planning')
  })

  test('affiche la mention de proposition refusée', () => {
    const text = mountMessage({
      role: 'assistant',
      content: '',
      card: { kind: 'task_dismissed' },
    }).text()
    expect(text).toContain('Proposition refusée.')
  })

  test('la carte handoff diagnostic pointe vers la page diagnostic du moteur', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: 'Je vous oriente vers le diagnostic.',
      card: {
        kind: 'handoff',
        target: 'diagnosis',
        boatId: 3,
        engineId: 7,
        boatName: 'Mistral II',
        engineLabel: 'Yamaha 4AS',
      },
    })
    expect(wrapper.text()).toContain('Ouvrir le diagnostic pour Yamaha 4AS (Mistral II)')
    expect(wrapper.find('a').attributes('href')).toBe('/boats/3/engines/7/diagnostic')
  })

  test('la carte handoff pièces pointe vers le chat pièces détachées', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: 'Cherchons cette pièce.',
      card: {
        kind: 'handoff',
        target: 'part_search',
        boatId: 3,
        engineId: 7,
        boatName: 'Mistral II',
        engineLabel: 'Yamaha 4AS',
      },
    })
    expect(wrapper.find('a').attributes('href')).toBe('/boats/3/engines/7/spare-parts/chat')
  })
})
