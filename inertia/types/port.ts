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
  totalSpots: number
  freeSpots: number
}

export type SpotBoatRow = {
  id: number
  name: string
}

export type SpotRow = {
  id: number
  name: string
  description: string | null
  boat: SpotBoatRow | null
}

export type PontoonRow = {
  id: number
  name: string
  description: string | null
  positionX: number | null
  positionY: number | null
  spots: SpotRow[]
}

export type MouillageRow = {
  id: number
  name: string
  description: string | null
  positionX: number | null
  positionY: number | null
  spots: SpotRow[]
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
