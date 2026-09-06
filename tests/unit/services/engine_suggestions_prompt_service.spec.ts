import { test } from '@japa/runner'
import { buildEngineSuggestionsUserMessage } from '#services/engine_suggestions_prompt_service'
import type { EngineSuggestionsInput } from '#shared/types/ai'

const EMPTY_INPUT: EngineSuggestionsInput = {
  engine: {
    kind: 'outboard',
    fuel: null,
    family: null,
    brand: null,
    model: null,
    powerHp: null,
    hours: null,
    installHours: null,
    manufacturedAt: null,
    status: 'active',
  },
  parts: [],
  maintenanceTasks: [],
  maintenanceEvents: [],
  catalogOperations: [],
}

const FULL_INPUT: EngineSuggestionsInput = {
  engine: {
    kind: 'outboard',
    fuel: 'essence',
    family: 'outboard_petrol',
    brand: 'Yamaha',
    model: 'F100',
    powerHp: 100,
    hours: 480,
    installHours: 30,
    manufacturedAt: '2019-03-01',
    status: 'active',
  },
  parts: [
    {
      designation: 'Turbine',
      reference: 'YAM-123',
      wearState: 'to_replace',
      stock: 0,
      minStockAlert: 1,
      purchasedAt: '2023-04-15',
    },
  ],
  maintenanceTasks: [
    {
      title: 'Vidange',
      subject: 'engine',
      status: 'open',
      dueAt: '2026-10-01',
      dueEngineHours: 500,
    },
    { title: 'Tâche faite', subject: 'engine', status: 'done', dueAt: null, dueEngineHours: null },
  ],
  maintenanceEvents: [
    { title: 'Changement bougies', subject: 'engine', performedAt: '2026-05-12' },
  ],
  catalogOperations: [{ label: 'Oil change', intervalMonths: 12, intervalEngineHours: 100 }],
}

test.group('engine_suggestions_prompt_service — user message', () => {
  test('the English message carries engine identity, hours and every section', ({ assert }) => {
    const message = buildEngineSuggestionsUserMessage(FULL_INPUT, 'en')

    assert.include(message, 'Analyze this boat engine')
    assert.include(message, 'outboard Yamaha F100')
    assert.include(message, '100hp')
    assert.include(message, '480h (450h since installation)')
    assert.include(message, 'Turbine (YAM-123)')
    assert.include(message, 'wear: to_replace')
    assert.include(message, 'stock 0 (threshold 1)')
    assert.include(message, 'purchased on 2023-04-15')
    assert.include(message, 'Vidange — due 2026-10-01, at 500h')
    assert.include(message, '2026-05-12: Changement bougies')
    assert.include(message, 'Oil change: every 12 months / every 100h')
    assert.notInclude(message, 'usure')
    assert.notInclude(message, 'Analyse ce moteur')
  })

  test('the French message localizes every label', ({ assert }) => {
    const message = buildEngineSuggestionsUserMessage(FULL_INPUT, 'fr')

    assert.include(message, 'Analyse ce moteur de bateau')
    assert.include(message, '100ch')
    assert.include(message, "480h (450h depuis l'installation)")
    assert.include(message, 'usure : to_replace')
    assert.include(message, 'stock 0 (seuil 1)')
    assert.include(message, 'achetée le 2023-04-15')
    assert.include(message, 'Vidange — échéance 2026-10-01, à 500h')
    assert.include(message, 'Oil change : tous les 12 mois / toutes les 100h')
  })

  test('closed tasks are excluded from the open-tasks section', ({ assert }) => {
    const message = buildEngineSuggestionsUserMessage(FULL_INPUT, 'en')

    assert.notInclude(message, 'Tâche faite')
  })

  test('empty lists are localized', ({ assert }) => {
    const en = buildEngineSuggestionsUserMessage(EMPTY_INPUT, 'en')
    assert.include(en, 'Parts:\nNone')
    assert.include(en, 'Open maintenance tasks:\nNone')
    assert.include(en, 'unknown hours')
    assert.notInclude(en, 'Aucune')

    const fr = buildEngineSuggestionsUserMessage(EMPTY_INPUT, 'fr')
    assert.include(fr, 'Pièces :\nAucune')
    assert.include(fr, 'heures inconnues')
  })
})
