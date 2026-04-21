export type BoatListSort = 'recent' | 'name'
export type BoatListDirection = 'asc' | 'desc'

export type BoatListFilters = {
  q?: string
  type?: string
  propulsionType?: string
  sort: BoatListSort
  direction: BoatListDirection
  page: number
  perPage: number
}

export type BoatListMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export type BoatMaintenanceBadge = {
  urgentCount: number
  upcomingCount: number
  nextDueAt: string | null
}

export type BoatListItem = {
  id: number
  name: string
  registrationNumber: string | null
  type: string | null
  propulsionType: string | null
  updatedAt: string | null
  maintenance: BoatMaintenanceBadge
}

export type BoatsPaginated = {
  data: BoatListItem[]
  meta: BoatListMeta
}
