import { BoatEquipmentNotFoundError, BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type Organization from '#models/organization'
import type User from '#models/user'
import type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload,
} from '#shared/types/boat'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatRigService from '#services/boat_rig_service'
import BoatSafetyEquipmentService from '#services/boat_safety_equipment_service'
import BoatSailService from '#services/boat_sail_service'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError, BoatNotFoundError }
export type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload,
}

@inject()
export default class BoatEquipmentService {
  constructor(
    private engineService: BoatEngineService,
    private sailService: BoatSailService,
    private rigService: BoatRigService,
    private enginePartService: BoatEnginePartService,
    private safetyEquipmentService: BoatSafetyEquipmentService
  ) {}

  async createEngine(user: User, boat: Boat, payload: BoatEnginePayload) {
    return this.engineService.create(user, boat, payload)
  }

  async updateEngine(user: User, boat: Boat, engineId: number, payload: BoatEnginePayload) {
    return this.engineService.update(user, boat, engineId, payload)
  }

  async deleteEngine(user: User, boat: Boat, engineId: number, org?: Organization) {
    return this.engineService.delete(user, boat, engineId, org)
  }

  async updateEngineStatus(user: User, boat: Boat, engineId: number, status: string) {
    return this.engineService.updateStatus(user, boat, engineId, status)
  }

  async updateEngineNotes(user: User, boat: Boat, engineId: number, notes: string | null) {
    return this.engineService.updateNotes(user, boat, engineId, notes)
  }

  async createSail(user: User, boat: Boat, payload: BoatSailPayload) {
    return this.sailService.create(user, boat, payload)
  }

  async updateSail(user: User, boat: Boat, sailId: number, payload: BoatSailPayload) {
    return this.sailService.update(user, boat, sailId, payload)
  }

  async deleteSail(user: User, boat: Boat, sailId: number, org?: Organization) {
    return this.sailService.delete(user, boat, sailId, org)
  }

  async upsertRig(user: User, boat: Boat, payload: BoatRigPayload) {
    return this.rigService.upsert(user, boat, payload)
  }

  async deleteRig(user: User, boat: Boat, org?: Organization) {
    return this.rigService.delete(user, boat, org)
  }

  async createEnginePart(user: User, boat: Boat, engineId: number, payload: BoatEnginePartPayload) {
    return this.enginePartService.create(user, boat, engineId, payload)
  }

  async updateEnginePart(
    user: User,
    boat: Boat,
    engineId: number,
    partId: number,
    payload: BoatEnginePartPayload
  ) {
    return this.enginePartService.update(user, boat, engineId, partId, payload)
  }

  async deleteEnginePart(
    user: User,
    boat: Boat,
    engineId: number,
    partId: number,
    org?: Organization
  ) {
    return this.enginePartService.delete(user, boat, engineId, partId, org)
  }

  async findEnginePart(engineId: number, partId: number) {
    return this.enginePartService.findForEngine(engineId, partId)
  }

  async findSafetyEquipment(boatId: number, itemId: number) {
    return this.safetyEquipmentService.findForBoat(boatId, itemId)
  }

  async createSafetyEquipment(user: User, boat: Boat, payload: BoatSafetyEquipmentPayload) {
    return this.safetyEquipmentService.create(user, boat, payload)
  }

  async updateSafetyEquipment(
    user: User,
    boat: Boat,
    itemId: number,
    payload: BoatSafetyEquipmentPayload
  ) {
    return this.safetyEquipmentService.update(user, boat, itemId, payload)
  }

  async deleteSafetyEquipment(user: User, boat: Boat, itemId: number, org?: Organization) {
    return this.safetyEquipmentService.delete(user, boat, itemId, org)
  }
}
