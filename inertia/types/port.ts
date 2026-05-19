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
