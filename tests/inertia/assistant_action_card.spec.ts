import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import AssistantActionCard from '../../inertia/components/assistant/AssistantActionCard.vue'
import type {
  AssistantEngineHoursAction,
  AssistantPartStockAction,
  AssistantPendingAction,
  AssistantTaskAction,
} from '../../shared/types/assistant'

const routerPost = vi.fn()
let capabilities: string[] = ['maintenance.create']

vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({
    props: {
      appT: {
        'assistant.proposal.kinds.create_task': 'Proposition de tache de maintenance',
        'assistant.proposal.kinds.add_engine_hours': "Ajout d'heures moteur",
        'assistant.proposal.kinds.set_part_stock': 'Mise a jour de stock',
        'assistant.proposal.kinds.start_trip': 'Ouverture de sortie',
        'assistant.proposal.kinds.close_trip': 'Cloture de sortie',
        'assistant.proposal.kinds.log_fuel': 'Plein de carburant',
        'assistant.proposal.kinds.report_incident': "Declaration d'incident",
        'assistant.proposal.kinds.create_reservation': 'Proposition de reservation',
        'assistant.proposal.kinds.create_client': 'Nouvelle fiche client',
        'assistant.proposal.title': 'Proposition de tache',
        'assistant.proposal.boat': 'Bateau :',
        'assistant.proposal.engine': 'Moteur :',
        'assistant.proposal.due': 'Echeance :',
        'assistant.proposal.dueHours': '{hours} heures moteur',
        'assistant.proposal.recurrence': 'Recurrence :',
        'assistant.proposal.recurrenceMonths': 'tous les {count} mois',
        'assistant.proposal.recurrenceHours': 'toutes les {hours} heures moteur',
        'assistant.proposal.increment': '+{hours} h',
        'assistant.proposal.currentHours': 'Compteur actuel :',
        'assistant.proposal.part': 'Piece :',
        'assistant.proposal.stock': 'Stock :',
        'assistant.proposal.stockChange': '{old} -> {new}',
        'assistant.proposal.confirm': 'Creer la tache',
        'assistant.proposal.confirmAction': 'Confirmer',
        'assistant.proposal.dismiss': 'Refuser',
        'assistant.proposal.noPermission':
          "Vous n'avez pas la permission d'effectuer cette action.",
      },
      locale: 'fr',
      permissions: { role: 'admin', capabilities },
    },
  }),
}))

function makeTaskProposal(overrides: Partial<AssistantTaskAction> = {}): AssistantTaskAction {
  return {
    kind: 'create_task',
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

function makeEngineHoursAction(
  overrides: Partial<AssistantEngineHoursAction> = {}
): AssistantEngineHoursAction {
  return {
    kind: 'add_engine_hours',
    boatId: 1,
    boatName: 'Mistral II',
    engineId: 2,
    engineLabel: 'Yamaha 4AS',
    incrementBy: 15,
    currentHours: 250,
    ...overrides,
  }
}

function makePartStockAction(
  overrides: Partial<AssistantPartStockAction> = {}
): AssistantPartStockAction {
  return {
    kind: 'set_part_stock',
    boatId: 1,
    boatName: 'Mistral II',
    engineId: 2,
    engineLabel: 'Yamaha 4AS',
    partId: 42,
    designation: 'Filtre a huile',
    reference: 'YAM-F-001',
    oldStock: 3,
    newStock: 1,
    ...overrides,
  }
}

function mountCard(proposal: AssistantPendingAction = makeTaskProposal()) {
  return mount(AssistantActionCard, { props: { token: 'cafebabe0001', proposal } })
}

describe('AssistantActionCard', () => {
  beforeEach(() => {
    routerPost.mockClear()
    capabilities = ['maintenance.create', 'boats.edit']
  })

  test('affiche le recapitulatif de la proposition create_task (compat)', () => {
    const text = mountCard().text().replace(/\s+/g, ' ')
    expect(text).toContain('Proposition de tache de maintenance')
    expect(text).toContain('Vidange moteur')
    expect(text).toContain('Mistral II — Yamaha 4AS')
    expect(text).toContain('tous les 6 mois')
  })

  test('affiche une echeance en heures moteur pour create_task', () => {
    const text = mountCard(makeTaskProposal({ dueAt: null, dueEngineHours: 250 })).text()
    expect(text).toContain('250 heures moteur')
  })

  test('affiche le titre et increment pour add_engine_hours', () => {
    const wrapper = mountCard(makeEngineHoursAction())
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain("Ajout d'heures moteur")
    expect(text).toContain('+15 h')
    expect(text).toContain('Compteur actuel :')
    expect(text).toContain('250 h')
  })

  test('affiche le stock old -> new pour set_part_stock', () => {
    const wrapper = mountCard(makePartStockAction())
    const text = wrapper.text().replace(/\s+/g, ' ')
    expect(text).toContain('Mise a jour de stock')
    expect(text).toContain('Filtre a huile (YAM-F-001)')
    expect(text).toContain('3 -> 1')
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

  test('sans capability requise, le bouton confirmer est masque', () => {
    capabilities = []
    const wrapper = mountCard()
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).not.toContain('Creer la tache')
    expect(labels).toContain('Refuser')
    expect(wrapper.text()).toContain("Vous n'avez pas la permission")
  })

  test('bouton confirmer masque pour add_engine_hours sans boats.edit', () => {
    capabilities = ['maintenance.create'] // No boats.edit
    const wrapper = mountCard(makeEngineHoursAction())
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).not.toContain('Confirmer')
    expect(labels).toContain('Refuser')
  })
})
