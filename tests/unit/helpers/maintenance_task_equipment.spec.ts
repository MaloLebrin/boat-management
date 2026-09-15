import { test } from '@japa/runner'
import {
  equipmentFieldName,
  equipmentRefOf,
  equipmentRefsOf,
  requiredSubjectForEquipment,
  subjectForEquipment,
} from '#shared/helpers/maintenance_task_equipment'

test.group('maintenance_task_equipment helpers', () => {
  test('dedicated equipment maps to its own subject', ({ assert }) => {
    assert.equal(subjectForEquipment('engine'), 'engine')
    assert.equal(subjectForEquipment('sail'), 'sail')
    assert.equal(subjectForEquipment('rig'), 'rig')
    assert.equal(subjectForEquipment('safety'), 'safety')
  })

  test('generic equipment maps its category to a subject', ({ assert }) => {
    assert.equal(subjectForEquipment('generic', 'electrical'), 'electrical')
    assert.equal(subjectForEquipment('generic', 'energy'), 'electrical')
    assert.equal(subjectForEquipment('generic', 'plumbing'), 'plumbing')
    assert.equal(subjectForEquipment('generic', 'deck'), 'deck')
    assert.equal(subjectForEquipment('generic', 'anchoring'), 'deck')
    assert.equal(subjectForEquipment('generic', 'navigation'), 'other')
    assert.equal(subjectForEquipment('generic', 'comfort'), 'other')
    assert.equal(subjectForEquipment('generic'), 'other')
  })

  test('only dedicated equipment imposes a subject', ({ assert }) => {
    assert.equal(requiredSubjectForEquipment('safety'), 'safety')
    assert.isNull(requiredSubjectForEquipment('generic'))
  })

  test('field names and refs round-trip', ({ assert }) => {
    assert.equal(equipmentFieldName('safety'), 'boatSafetyEquipmentId')
    assert.equal(equipmentFieldName('generic'), 'boatGenericEquipmentId')

    assert.isNull(equipmentRefOf({ boatEngineId: null, boatSailId: null }))
    assert.deepEqual(equipmentRefOf({ boatEngineId: null, boatGenericEquipmentId: 4 }), {
      type: 'generic',
      id: 4,
    })
    assert.deepEqual(equipmentRefsOf({ boatEngineId: 1, boatSailId: 2 }), [
      { type: 'engine', id: 1 },
      { type: 'sail', id: 2 },
    ])
  })
})
