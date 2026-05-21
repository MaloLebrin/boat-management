export { default } from '#services/boat_hull_service'
export { BoatNotFoundError, BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
export type {
  BoatEnginePartPayload,
  BoatEnginePayload,
  BoatHullPayload,
  BoatRigPayload,
  BoatSafetyEquipmentPayload,
  BoatSailPayload,
} from '#shared/types/boat'
