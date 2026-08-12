import { test } from '@japa/runner'
import {
  buildBoatUserMessage,
  buildFleetUserMessage,
  buildSystemPrompt,
} from '#services/ai_prompt_service'
import type { BoatSuggestionsInput, FleetAnalysisInput } from '#shared/types/ai'

const FLEET_INPUT: FleetAnalysisInput = {
  boats: [
    { name: 'Sun Odyssey 35', propulsionType: null, enginesCount: 1, sailsCount: 2, hasRig: true },
  ],
  urgentMaintenance: [
    {
      boatName: 'Sun Odyssey 35',
      title: 'Oil change',
      kind: 'hours',
      dueAt: null,
      dueEngineHours: 500,
      currentEngineHours: 490,
    },
  ],
  stats: { boats: 1, engines: 1, sails: 2, rigs: 1, urgentMaintenance: 1 },
}

const EMPTY_BOAT_INPUT: BoatSuggestionsInput = {
  boat: {
    id: 1,
    name: 'Sun Odyssey 35',
    type: null,
    propulsionType: null,
    yearBuilt: null,
    manufacturer: null,
    model: null,
    homePort: null,
    navigationCategory: null,
    engines: [],
    sails: [],
    rig: null,
    safetyEquipment: [],
  },
  maintenanceTasks: [],
  maintenanceEvents: [],
}

test.group('ai_prompt_service — system prompt (#460)', () => {
  test('the English prompt asks for English suggestions and holds no French', ({ assert }) => {
    const prompt = buildSystemPrompt('en')

    assert.include(prompt, 'Write every suggestion in English')
    assert.notInclude(prompt, 'français')
    assert.notInclude(prompt, 'Tu es')
  })

  test('the French prompt asks for French suggestions', ({ assert }) => {
    const prompt = buildSystemPrompt('fr')

    assert.include(prompt, 'Rédige toutes les suggestions en français')
    assert.include(prompt, 'Tu es un expert en maintenance marine')
  })

  test('both prompts constrain the answer to a JSON array of "text" objects', ({ assert }) => {
    for (const locale of ['en', 'fr'] as const) {
      assert.include(buildSystemPrompt(locale), '"text"')
    }
  })
})

test.group('ai_prompt_service — fleet user message (#460)', () => {
  test('the English message carries no French label', ({ assert }) => {
    const message = buildFleetUserMessage(FLEET_INPUT, 'en')

    assert.include(message, 'Analyze this fleet of boats')
    assert.include(message, 'unknown type')
    assert.include(message, 'engine(s)')
    assert.include(message, 'rig')
    assert.include(message, '490h logged / 500h required')
    assert.notInclude(message, 'moteur')
    assert.notInclude(message, 'inconnu')
    assert.notInclude(message, 'actuelles')
  })

  test('the French message keeps the original wording', ({ assert }) => {
    const message = buildFleetUserMessage(FLEET_INPUT, 'fr')

    assert.include(message, 'Analyse cette flotte de bateaux')
    assert.include(message, 'type inconnu')
    assert.include(message, 'moteur(s)')
    assert.include(message, '490h actuelles / 500h requises')
  })

  test('an empty urgent maintenance list is localized', ({ assert }) => {
    const input: FleetAnalysisInput = { ...FLEET_INPUT, urgentMaintenance: [] }

    assert.include(buildFleetUserMessage(input, 'en'), 'None')
    assert.include(buildFleetUserMessage(input, 'fr'), 'Aucune')
  })
})

test.group('ai_prompt_service — boat user message (#460)', () => {
  test('empty sections and unknown fields are localized in English', ({ assert }) => {
    const message = buildBoatUserMessage(EMPTY_BOAT_INPUT, 'en')

    assert.include(message, 'Analyze this boat')
    assert.include(message, 'unknown year')
    assert.include(message, 'Engines:\nNone')
    assert.include(message, 'Open tasks: 0')
    assert.notInclude(message, 'Aucun')
    assert.notInclude(message, 'inconnue')
    assert.notInclude(message, 'Gréement')
  })

  test('empty sections and unknown fields stay French for a French user', ({ assert }) => {
    const message = buildBoatUserMessage(EMPTY_BOAT_INPUT, 'fr')

    assert.include(message, 'Analyse ce bateau')
    assert.include(message, 'année inconnue')
    assert.include(message, 'Moteurs :\nAucun')
    assert.include(message, 'Tâches ouvertes : 0')
  })

  test('safety equipment expiry is labelled in the requested locale', ({ assert }) => {
    const input: BoatSuggestionsInput = {
      ...EMPTY_BOAT_INPUT,
      boat: {
        ...EMPTY_BOAT_INPUT.boat,
        safetyEquipment: [{ equipmentType: 'liferaft', expiryDate: '2027-01-01', status: 'ok' }],
      },
    }

    assert.include(buildBoatUserMessage(input, 'en'), 'expires 2027-01-01')
    assert.include(buildBoatUserMessage(input, 'fr'), 'expire 2027-01-01')
  })
})
