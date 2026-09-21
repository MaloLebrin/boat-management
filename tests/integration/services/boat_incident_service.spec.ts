import { test } from '@japa/runner'
import BoatIncidentService from '#services/boat_incident_service'
import { BoatIncidentValidationError } from '#exceptions/incident_errors'
import { toIncidentTarget } from '#transformers/boat_transformer'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { incidentTargetFieldName } from '#shared/helpers/incident_target'
import type { IncidentTargetType } from '#shared/types/incident'
import type Boat from '#models/boat'

/**
 * Cible d'un incident (#813) : chaque famille d'équipement, plus la pièce
 * moteur, est acceptée quand elle appartient au bateau et refusée sinon.
 */

const BASE_PAYLOAD = {
  occurredAt: '2026-06-01T10:00:00.000Z',
  type: 'engine_failure' as const,
  description: 'Ne démarre plus',
}

async function makeUserBoat() {
  const user = await UserFactory.with('organization').create()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  return { user, boat }
}

const EQUIPMENT_FACTORIES = {
  engine: BoatEngineFactory,
  sail: BoatSailFactory,
  rig: BoatRigFactory,
  safety: BoatSafetyEquipmentFactory,
  generic: BoatGenericEquipmentFactory,
} as const

async function makeTarget(type: IncidentTargetType, boat: Boat): Promise<number> {
  if (type === 'engine_part') {
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
    return part.id
  }
  const equipment = await EQUIPMENT_FACTORIES[type].merge({ boatId: boat.id }).create()
  return equipment.id
}

const TARGET_TYPES: IncidentTargetType[] = [
  'engine',
  'sail',
  'rig',
  'safety',
  'generic',
  'engine_part',
]

test.group('BoatIncidentService — cible (#813)', () => {
  for (const type of TARGET_TYPES) {
    test(`createForBoat accepte une cible « ${type} » du bateau`, async ({ assert }) => {
      const { user, boat } = await makeUserBoat()
      const id = await makeTarget(type, boat)
      const field = incidentTargetFieldName(type)

      const incident = await new BoatIncidentService().createForBoat(user, boat, {
        ...BASE_PAYLOAD,
        [field]: id,
      })

      assert.equal(incident[field], id)
    })

    test(`createForBoat refuse une cible « ${type} » d'un autre bateau`, async ({ assert }) => {
      const { user, boat } = await makeUserBoat()
      const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const foreignId = await makeTarget(type, otherBoat)

      await assert.rejects(
        () =>
          new BoatIncidentService().createForBoat(user, boat, {
            ...BASE_PAYLOAD,
            [incidentTargetFieldName(type)]: foreignId,
          }),
        BoatIncidentValidationError
      )
    })
  }

  test('createForBoat refuse deux cibles à la fois', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const engineId = await makeTarget('engine', boat)
    const sailId = await makeTarget('sail', boat)

    try {
      await new BoatIncidentService().createForBoat(user, boat, {
        ...BASE_PAYLOAD,
        boatEngineId: engineId,
        boatSailId: sailId,
      })
      assert.fail('expected a validation error')
    } catch (error) {
      assert.instanceOf(error, BoatIncidentValidationError)
      assert.equal((error as BoatIncidentValidationError).errorCode, 'multipleEquipment')
    }
  })

  test('updateForBoat ne touche pas à la cible quand aucune clé n’est envoyée', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const engineId = await makeTarget('engine', boat)
    const service = new BoatIncidentService()
    const incident = await service.createForBoat(user, boat, {
      ...BASE_PAYLOAD,
      boatEngineId: engineId,
    })

    await service.updateForBoat(user, boat, incident.id, { status: 'in_progress' })

    await incident.refresh()
    assert.equal(incident.boatEngineId, engineId)
  })

  test('listForBoat précharge la cible : le transformer donne famille, id et libellé', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      brand: 'Yamaha',
      model: 'F100',
    }).create()
    const part = await BoatEnginePartFactory.merge({
      boatEngineId: engine.id,
      designation: 'Bougie NGK',
    }).create()
    const service = new BoatIncidentService()
    await service.createForBoat(user, boat, { ...BASE_PAYLOAD, boatEngineId: engine.id })
    await service.createForBoat(user, boat, { ...BASE_PAYLOAD, boatEnginePartId: part.id })
    await service.createForBoat(user, boat, BASE_PAYLOAD)

    const incidents = await service.listForBoat(user, boat)
    const rows = incidents.map(toIncidentTarget)

    assert.deepInclude(rows, { type: 'engine', id: engine.id, name: 'Yamaha F100' })
    assert.deepInclude(rows, {
      type: 'engine_part',
      id: part.id,
      name: 'Bougie NGK',
      engineId: engine.id,
    })
    assert.include(rows, null)
  })
})
