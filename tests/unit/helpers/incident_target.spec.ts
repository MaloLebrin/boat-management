import { test } from '@japa/runner'
import {
  hasIncidentTargetInput,
  incidentTargetColumns,
  incidentTargetFieldName,
  incidentTargetRefOf,
  incidentTargetRefsOf,
  INCIDENT_TARGET_FIELDS,
} from '#shared/helpers/incident_target'

test.group('incident_target helpers (#813)', () => {
  test('chaque famille a sa colonne, la pièce comprise', ({ assert }) => {
    assert.equal(incidentTargetFieldName('engine'), 'boatEngineId')
    assert.equal(incidentTargetFieldName('sail'), 'boatSailId')
    assert.equal(incidentTargetFieldName('rig'), 'boatRigId')
    assert.equal(incidentTargetFieldName('safety'), 'boatSafetyEquipmentId')
    assert.equal(incidentTargetFieldName('generic'), 'boatGenericEquipmentId')
    assert.equal(incidentTargetFieldName('engine_part'), 'boatEnginePartId')
    assert.lengthOf(INCIDENT_TARGET_FIELDS, 6)
  })

  test('incidentTargetRefsOf ignore null et undefined, garde les nombres', ({ assert }) => {
    assert.deepEqual(incidentTargetRefsOf({}), [])
    assert.deepEqual(incidentTargetRefsOf({ boatEngineId: null, boatSailId: undefined }), [])
    assert.deepEqual(incidentTargetRefsOf({ boatEnginePartId: 7 }), [
      { type: 'engine_part', id: 7 },
    ])
    assert.deepEqual(incidentTargetRefsOf({ boatEngineId: 1, boatRigId: 2 }), [
      { type: 'engine', id: 1 },
      { type: 'rig', id: 2 },
    ])
  })

  test('incidentTargetRefOf renvoie la première cible ou null', ({ assert }) => {
    assert.isNull(incidentTargetRefOf({ boatEngineId: null }))
    assert.deepEqual(incidentTargetRefOf({ boatSailId: 3 }), { type: 'sail', id: 3 })
  })

  test('incidentTargetColumns pose la seule colonne de la cible, les autres à null', ({
    assert,
  }) => {
    assert.deepEqual(incidentTargetColumns({ type: 'safety', id: 9 }), {
      boatEngineId: null,
      boatSailId: null,
      boatRigId: null,
      boatSafetyEquipmentId: 9,
      boatGenericEquipmentId: null,
      boatEnginePartId: null,
    })
    assert.isTrue(Object.values(incidentTargetColumns(null)).every((v) => v === null))
  })

  test('hasIncidentTargetInput distingue « absent » de « null »', ({ assert }) => {
    assert.isFalse(hasIncidentTargetInput({}))
    assert.isFalse(hasIncidentTargetInput({ boatEngineId: undefined }))
    assert.isTrue(hasIncidentTargetInput({ boatEngineId: null }))
    assert.isTrue(hasIncidentTargetInput({ boatGenericEquipmentId: 4 }))
  })
})
