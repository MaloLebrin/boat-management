export type PortListItem = {
  id: number
  name: string
  city: string | null
  country: string | null
  address: string | null
  notes: string | null
  pontoonCount: number
  mouillageCount: number
  boatCount: number
}

export type PontoonBoatRow = {
  id: number
  name: string
  spotIdentifier: string | null
}

export type PontoonRow = {
  id: number
  name: string
  description: string | null
  positionX: number | null
  positionY: number | null
  boats: PontoonBoatRow[]
}

export type MouillageBoatRow = {
  id: number
  name: string
}

export type MouillageRow = {
  id: number
  name: string
  description: string | null
  positionX: number | null
  positionY: number | null
  boats: MouillageBoatRow[]
}

export type PortShowDetail = {
  id: number
  name: string
  city: string | null
  country: string | null
  address: string | null
  notes: string | null
  pontoons: PontoonRow[]
  mouillages: MouillageRow[]
}
