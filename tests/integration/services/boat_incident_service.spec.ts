import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
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
import { MediaFactory } from '#database/factories/media_factory'
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

      const service = await app.container.make(BoatIncidentService)
      const incident = await service.createForBoat(user, boat, {
        ...BASE_PAYLOAD,
        [field]: id,
      })

      assert.equal(incident[field], id)
    })

    test(`createForBoat refuse une cible « ${type} » d'un autre bateau`, async ({ assert }) => {
      const { user, boat } = await makeUserBoat()
      const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const foreignId = await makeTarget(type, otherBoat)

      const service = await app.container.make(BoatIncidentService)
      await assert.rejects(
        () =>
          service.createForBoat(user, boat, {
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
      const service = await app.container.make(BoatIncidentService)
      await service.createForBoat(user, boat, {
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
    const service = await app.container.make(BoatIncidentService)
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
    const service = await app.container.make(BoatIncidentService)
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

  test('listForBoat compte les photos de chaque incident en une requête (#814)', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const service = await app.container.make(BoatIncidentService)
    const withPhotos = await service.createForBoat(user, boat, BASE_PAYLOAD)
    await service.createForBoat(user, boat, BASE_PAYLOAD)
    await MediaFactory.merge({
      entityType: 'boat_incident',
      entityId: withPhotos.id,
      kind: 'photo',
    }).createMany(2)

    const incidents = await service.listForBoat(user, boat)

    const counts = new Map(incidents.map((i) => [i.id, i.$extras.photosCount]))
    assert.equal(counts.get(withPhotos.id), 2)
    assert.equal([...counts.values()].filter((c) => c === 0).length, 1)
  })
})

/**
 * Photo obligatoire : la garantie serveur tient au point de **clôture**, parce
 * que la création est un POST JSON rejouable hors-ligne et que le copilote
 * n'a aucun fichier à fournir. C'est donc là que se referme le filet.
 */
test.group('BoatIncidentService — clôture sans photo', () => {
  test('clôturer un incident sans photo est refusé', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const service = await app.container.make(BoatIncidentService)
    const incident = await service.createForBoat(user, boat, BASE_PAYLOAD)

    try {
      await service.updateForBoat(user, boat, incident.id, { status: 'closed' })
      assert.fail('la clôture aurait dû être refusée')
    } catch (error) {
      assert.instanceOf(error, BoatIncidentValidationError)
      assert.equal((error as BoatIncidentValidationError).errorCode, 'photoRequiredToClose')
    }

    await incident.refresh()
    assert.equal(incident.status, 'open')
  })

  test('une photo attachée débloque la clôture', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const service = await app.container.make(BoatIncidentService)
    const incident = await service.createForBoat(user, boat, BASE_PAYLOAD)
    await MediaFactory.merge({
      entityType: 'boat_incident',
      entityId: incident.id,
      kind: 'photo',
    }).create()

    const closed = await service.updateForBoat(user, boat, incident.id, { status: 'closed' })

    assert.equal(closed.status, 'closed')
    assert.isNotNull(closed.closedAt)
  })

  test('un document ne tient pas lieu de photo', async ({ assert }) => {
    const { user, boat } = await makeUserBoat()
    const service = await app.container.make(BoatIncidentService)
    const incident = await service.createForBoat(user, boat, BASE_PAYLOAD)
    await MediaFactory.merge({
      entityType: 'boat_incident',
      entityId: incident.id,
      kind: 'document',
    }).create()

    await assert.rejects(
      () => service.updateForBoat(user, boat, incident.id, { status: 'closed' }),
      BoatIncidentValidationError
    )
  })

  test('la règle ne porte que sur la transition, pas sur un incident déjà clos', async ({
    assert,
  }) => {
    const { user, boat } = await makeUserBoat()
    const service = await app.container.make(BoatIncidentService)
    const incident = await service.createForBoat(user, boat, BASE_PAYLOAD)
    // Clôturé avant l'obligation de preuve : il doit rester éditable, sinon
    // tout l'historique antérieur devient ingérable.
    incident.status = 'closed'
    await incident.save()

    const updated = await service.updateForBoat(user, boat, incident.id, {
      status: 'closed',
      location: 'Quai Nord',
    })

    assert.equal(updated.location, 'Quai Nord')
    assert.equal(updated.status, 'closed')
  })
})
