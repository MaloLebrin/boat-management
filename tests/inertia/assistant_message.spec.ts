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
        'assistant.taskCreated.title': 'Tache creee pour {boat}',
        'assistant.taskCreated.dueHours': 'Echeance a {hours} heures moteur',
        'assistant.taskCreated.viewPlanning': 'Voir dans le planning',
        'assistant.taskDismissed': 'Proposition refusee.',
        'assistant.handoff.diagnosis': 'Ouvrir le diagnostic pour {engine} ({boat})',
        'assistant.handoff.partSearch': 'Chercher une piece pour {engine} ({boat})',
        'assistant.sources.fleet_data': 'Donnees de votre flotte',
        'assistant.sources.general': 'Connaissance generale',
        'assistant.navTargets.engines': 'Voir les moteurs',
        'assistant.actionDone.add_engine_hours': 'Heures moteur ajoutees',
        'assistant.actionDone.start_trip': 'Sortie ouverte au journal de bord',
        'assistant.actionDone.log_fuel': 'Plein enregistre',
        'assistant.actionDone.set_part_stock': 'Stock mis a jour',
        'assistant.card.actionDismissed': 'Proposition refusee.',
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

  test('affiche la carte de tache creee via i18n, jamais du texte LLM', () => {
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
    expect(text).toContain('Tache creee pour Mistral II')
    expect(text).toContain('Vidange moteur')
    expect(text).toContain('Echeance a 250 heures moteur')
    expect(wrapper.find('a').attributes('href')).toBe('/planning')
  })

  test('affiche la mention de proposition refusee', () => {
    const text = mountMessage({
      role: 'assistant',
      content: '',
      card: { kind: 'task_dismissed' },
    }).text()
    expect(text).toContain('Proposition refusee.')
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

  test('affiche le badge de source i18n sous la bulle (#642)', () => {
    const text = mountMessage({
      role: 'assistant',
      content: 'Le moteur totalise 220 heures.',
      source: 'fleet_data',
    }).text()
    expect(text).toContain('Donnees de votre flotte')
  })

  test('aucun badge quand la reponse ne porte pas de source', () => {
    const text = mountMessage({ role: 'assistant', content: 'Bonjour.' }).text()
    expect(text).not.toContain('Donnees de votre flotte')
  })

  test('rend le lien de navigation valide cote serveur en <Link> (#642)', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: 'Vos moteurs sont listes ici.',
      source: 'general',
      navTarget: 'engines.index',
    })
    expect(wrapper.text()).toContain('Connaissance generale')
    expect(wrapper.text()).toContain('Voir les moteurs')
    expect(wrapper.find('a').attributes('href')).toBe('/engines')
  })

  test('la carte handoff pieces pointe vers le chat pieces detachees', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: 'Cherchons cette piece.',
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

  test('affiche la carte action_done avec label et boatName', () => {
    const wrapper = mountMessage({
      role: 'assistant',
      content: '',
      card: {
        kind: 'action_done',
        actionKind: 'add_engine_hours',
        boatName: 'Mistral II',
        label: '+15 h sur Yamaha 4AS',
        entityId: 42,
      },
    })
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Heures moteur ajoutees')
    expect(text).toContain('+15 h sur Yamaha 4AS')
    expect(text).toContain('Mistral II')
  })

  test('affiche la carte action_dismissed', () => {
    const text = mountMessage({
      role: 'assistant',
      content: '',
      card: { kind: 'action_dismissed', actionKind: 'log_fuel' },
    }).text()
    expect(text).toContain('Proposition refusee.')
  })
})
