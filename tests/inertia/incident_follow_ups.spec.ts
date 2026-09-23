import { describe, expect, test } from 'vitest'
import {
  actionPrefillForIncident,
  countFollowUps,
  equipmentRefOfIncidentTarget,
  taskPrefillForIncident,
} from '../../inertia/utils/incident_follow_ups'

const engineIncident = { id: 42, target: { type: 'engine' as const, id: 12, name: 'Yamaha F100' } }
const partIncident = {
  id: 43,
  target: { type: 'engine_part' as const, id: 7, name: 'Impeller', engineId: 12 },
}
const boatIncident = { id: 44, target: null }

describe('incident_follow_ups — pré-remplissage des suites (#815)', () => {
  test('un équipement visé devient la référence de la tâche ou de l’action', () => {
    expect(equipmentRefOfIncidentTarget(engineIncident.target)).toEqual({ type: 'engine', id: 12 })
  })

  test('une pièce moteur n’est pas rabattue sur son moteur', () => {
    expect(equipmentRefOfIncidentTarget(partIncident.target)).toBeNull()
    expect(equipmentRefOfIncidentTarget(null)).toBeNull()
  })

  test('la tâche reprend le titre, l’équipement verrouillé et l’incident d’origine', () => {
    expect(taskPrefillForIncident(engineIncident, 'Avarie moteur')).toEqual({
      prefill: {
        title: 'Avarie moteur',
        boatIncidentId: 42,
        equipment: { type: 'engine', id: 12 },
      },
      lockEquipment: true,
    })
  })

  test('sans équipement (pièce ou bateau entier), la tâche reste libre', () => {
    expect(taskPrefillForIncident(partIncident, 'Avarie moteur')).toEqual({
      prefill: { title: 'Avarie moteur', boatIncidentId: 43 },
      lockEquipment: false,
    })
    expect(taskPrefillForIncident(boatIncident, 'Échouage').lockEquipment).toBe(false)
  })

  test('l’action est « à réparer », sur le même équipement, tracée par l’incident', () => {
    expect(actionPrefillForIncident(engineIncident, 'Avarie moteur')).toEqual({
      label: 'Avarie moteur',
      actionType: 'to_repair',
      boatIncidentId: 42,
      equipmentType: 'engine',
      equipmentId: 12,
    })
    expect(actionPrefillForIncident(partIncident, 'Avarie moteur')).toEqual({
      label: 'Avarie moteur',
      actionType: 'to_repair',
      boatIncidentId: 43,
    })
  })

  test('compte les tâches et actions tracées par l’incident seulement', () => {
    const tasks = [{ boatIncidentId: 42 }, { boatIncidentId: 43 }, { boatIncidentId: null }]
    const actions = [{ boatIncidentId: 42 }, { boatIncidentId: null }]

    expect(countFollowUps(42, tasks, actions)).toBe(2)
    expect(countFollowUps(43, tasks, actions)).toBe(1)
    expect(countFollowUps(44, tasks, actions)).toBe(0)
  })
})
