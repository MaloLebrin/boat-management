/** Inertia props shapes for boat detail / maintenance UI. */

export type BoatShowEngine = {
  id: number
  kind: string
  fuel: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
}

export type BoatShowSail = {
  id: number
  sailType: string
  manufacturedAt: string | null
  areaM2: number | null
  material: string | null
  reefPoints: number | null
}

export type BoatShowRig = {
  id: number
  rigType: string
  manufacturedAt: string | null
  mastCount: number | null
  spreaders: number | null
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
  engines: BoatShowEngine[]
  sails: BoatShowSail[]
  rig: BoatShowRig | null
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
