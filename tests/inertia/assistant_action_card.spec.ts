import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import AssistantActionCard from '../../inertia/components/assistant/AssistantActionCard.vue'
import type { AssistantTaskProposal } from '../../shared/types/assistant'

const routerPost = vi.fn()
let capabilities: string[] = ['maintenance.create']

vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({
    props: {
      appT: {
        'assistant.proposal.title': 'Proposition de tâche',
        'assistant.proposal.boat': 'Bateau :',
        'assistant.proposal.due': 'Échéance :',
        'assistant.proposal.dueHours': '{hours} heures moteur',
        'assistant.proposal.recurrence': 'Récurrence :',
        'assistant.proposal.recurrenceMonths': 'tous les {count} mois',
        'assistant.proposal.recurrenceHours': 'toutes les {hours} heures moteur',
        'assistant.proposal.confirm': 'Créer la tâche',
        'assistant.proposal.dismiss': 'Refuser',
        'assistant.proposal.noPermission':
          'Vous n’avez pas la permission de créer des tâches de maintenance.',
      },
      locale: 'fr',
      permissions: { role: 'admin', capabilities },
    },
  }),
}))

function makeProposal(overrides: Partial<AssistantTaskProposal> = {}): AssistantTaskProposal {
  return {
    boatId: 1,
    boatName: 'Mistral II',
    engineLabel: 'Yamaha 4AS',
    subject: 'engine',
    title: 'Vidange moteur',
    notes: null,
    boatEngineId: 2,
    dueAt: '2026-09-06',
    dueEngineHours: null,
    recurrenceIntervalMonths: 6,
    recurrenceIntervalEngineHours: null,
    ...overrides,
  }
}

function mountCard(proposal = makeProposal()) {
  return mount(AssistantActionCard, { props: { token: 'cafebabe0001', proposal } })
}

describe('AssistantActionCard', () => {
  beforeEach(() => {
    routerPost.mockClear()
    capabilities = ['maintenance.create']
  })

  test('affiche le récapitulatif de la proposition', () => {
    const text = mountCard().text().replace(/\s+/g, ' ')
    expect(text).toContain('Vidange moteur')
    expect(text).toContain('Mistral II — Yamaha 4AS')
    expect(text).toContain('tous les 6 mois')
  })

  test('affiche une échéance en heures moteur', () => {
    const text = mountCard(makeProposal({ dueAt: null, dueEngineHours: 250 })).text()
    expect(text).toContain('250 heures moteur')
  })

  test('confirmer poste sur la route de confirmation, sans payload', async () => {
    const wrapper = mountCard()
    await wrapper.findAll('button')[0].trigger('click')

    expect(routerPost).toHaveBeenCalledTimes(1)
    expect(routerPost.mock.calls[0][0]).toBe('/assistant/conversations/cafebabe0001/action/confirm')
    expect(routerPost.mock.calls[0][1]).toEqual({})
  })

  test('refuser poste sur la route de refus', async () => {
    const wrapper = mountCard()
    await wrapper.findAll('button')[1].trigger('click')

    expect(routerPost.mock.calls[0][0]).toBe('/assistant/conversations/cafebabe0001/action/dismiss')
  })

  test('sans maintenance.create, le bouton confirmer est masqué', () => {
    capabilities = []
    const wrapper = mountCard()
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).not.toContain('Créer la tâche')
    expect(labels).toContain('Refuser')
    expect(wrapper.text()).toContain('Vous n’avez pas la permission')
  })
})
