import type { DateTime } from 'luxon'

export type BoatHullPayload = {
  name: string
  registrationNumber?: string | null
  type?: string | null

  manufacturedAt?: Date | string | DateTime | null
  propulsionType?: string | null
  lengthM?: number | null
  beamM?: number | null
  draftM?: number | null
  mastHeightM?: number | null
  hullMaterial?: string | null
  yearBuilt?: number | null
  manufacturer?: string | null
  model?: string | null

  homePort?: string | null
  navigationCategory?: string | null
  hullIdentificationNumber?: string | null
  francisationNumber?: string | null
  flagCountry?: string | null
  maxPersons?: number | null

  spotId?: number | null
}

export type BoatEnginePayload = {
  kind: string
  fuel?: string | null
  strokeType?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  manufacturedAt?: Date | string | DateTime | null
  powerHp?: number | null
  hours?: number | null
  installHours?: number | null
  status?: string | null
}

export type BoatSailPayload = {
  sailType: string
  manufacturedAt?: Date | string | DateTime | null
  areaM2?: number | null
  material?: string | null
  reefPoints?: number | null
  status?: string | null
  notes?: string | null
}

export type BoatRigPayload = {
  rigType: string
  manufacturedAt?: Date | string | DateTime | null
  mastCount?: number | null
  spreaders?: number | null
  status?: string | null
  notes?: string | null
}

export const PART_WEAR_STATES = ['new', 'good', 'worn', 'to_replace', 'damaged'] as const
export type PartWearState = (typeof PART_WEAR_STATES)[number]

export type BoatEnginePartPayload = {
  designation: string
  reference?: string | null
  stock?: number | null
  supplier?: string | null
  notes?: string | null
  wearState?: PartWearState | null
}

export type BoatSafetyEquipmentPayload = {
  equipmentType: string
  quantity?: number | null
  expiryDate?: Date | string | DateTime | null
  status?: string | null
  notes?: string | null
}

export type BoatSerializedRow = {
  id: number | string
  name: string
  registrationNumber: string | null
  type: string | null
  propulsionType: string | null
  updatedAt: string | null
}

export type BoatListSort = 'recent' | 'name'
export type BoatListDirection = 'asc' | 'desc'

export type BoatListQuery = {
  q?: string
  type?: string
  propulsionType?: string
  sort?: BoatListSort
  direction?: BoatListDirection
  page?: number
  perPage?: number
}

export type BoatListItem = {
  id: number
  name: string
  registrationNumber: string | null
  type: string | null
  propulsionType: string | null
  updatedAt: string | null
  maintenance: {
    urgentCount: number
    upcomingCount: number
    nextDueAt: string | null
  }
}
