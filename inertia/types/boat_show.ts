/** Inertia props shapes for boat detail / maintenance UI. */

export type {
  BoatDocumentRow,
  BoatDocumentType,
  BoatDocumentStatus,
} from '../../shared/types/boat_document'

export type BoatShowSafetyEquipment = {
  id: number
  equipmentType: string
  quantity: number | null
  expiryDate: string | null
  status: 'ok' | 'to_check' | 'expired'
  notes: string | null
}

export type MediaRow = {
  id: number
  kind: 'photo' | 'document'
  secureUrl: string
  originalFilename: string
  format: string
  bytes: number
  width: number | null
  height: number | null
  position: number
  caption: string | null
}

export type BoatShowEnginePart = {
  id: number
  designation: string
  reference: string | null
  stock: number | null
  supplier: string | null
  notes: string | null
  wearState: 'new' | 'good' | 'worn' | 'to_replace' | 'damaged' | null
  documents: MediaRow[]
}

export type BoatShowEngine = {
  id: number
  kind: string
  fuel: string | null
  strokeType: '2_stroke' | '4_stroke' | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
  installHours: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
  notes: string | null
  documents: MediaRow[]
  parts: BoatShowEnginePart[]
}

export type BoatShowSail = {
  id: number
  sailType: string
  manufacturedAt: string | null
  areaM2: number | null
  material: string | null
  reefPoints: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
}

export type BoatShowRig = {
  id: number
  rigType: string
  manufacturedAt: string | null
  mastCount: number | null
  spreaders: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
}

export type BoatPositionHistoryRow = {
  id: number
  spotId: number | null
  spotName: string | null
  pontoonName: string | null
  mouillageNom: string | null
  portName: string | null
  startedAt: string
  endedAt: string | null
}

export type BoatShowDetail = {
  id: number
  name: string
  registrationNumber: string | null
  type: string | null
  propulsionType: string | null
  lengthM: number | null
  beamM: number | null
  draftM: number | null
  mastHeightM: number | null
  hullMaterial: string | null
  yearBuilt: number | null
  manufacturer: string | null
  model: string | null
  homePort: string | null
  navigationCategory: string | null
  hullIdentificationNumber: string | null
  francisationNumber: string | null
  flagCountry: string | null
  maxPersons: number | null
  spotId: number | null
  spot: {
    id: number
    name: string
    pontoonId: number | null
    pontoonName: string | null
    mouillageId: number | null
    mouillageNom: string | null
    portName: string | null
  } | null
  positionHistory: BoatPositionHistoryRow[]
  engines: BoatShowEngine[]
  sails: BoatShowSail[]
  rig: BoatShowRig | null
  media: MediaRow[]
  safetyEquipment: BoatShowSafetyEquipment[]
}

export type MaintenancePartRow = {
  id: number
  name: string
  quantity: number | null
  notes: string | null
}

export type MaintenanceEventRow = {
  id: number
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  parts: MaintenancePartRow[]
}

export type MaintenanceTaskRow = {
  id: number
  subject: string
  title: string
  notes: string | null
  status: 'open' | 'done'
  dueAt: string | null
  dueEngineHours: number | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  recurrenceIntervalMonths: number | null
  recurrenceIntervalEngineHours: number | null
}

export type MaintenanceSheetItemRow = {
  id: number
  label: string
  isDone: boolean
  notes: string | null
  position: number
}

export type MaintenanceSheetRow = {
  id: number
  type: 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier'
  title: string
  status: 'in_progress' | 'completed'
  performedAt: string
  notes: string | null
  items: MaintenanceSheetItemRow[]
}

export type { IncidentType, IncidentStatus, BoatIncidentRow } from '../../shared/types/incident'

export type AiSuggestion = { text: string }

export type MaintenanceLogPdfProps = {
  canExport: boolean
}
