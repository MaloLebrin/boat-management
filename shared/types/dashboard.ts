export type DashboardPortItem = {
  id: number
  name: string
  city: string | null
  country: string | null
  boatCount: number
  totalSpots: number
  freeSpots: number
}

export type DashboardPortStats = {
  total: number
  totalBoats: number
  totalFreeSpots: number
}

export type DashboardBoatSummary = {
  id: number
  name: string
  propulsionType: string | null
  enginesCount: number
  sailsCount: number
  hasRig: boolean
}

export type DashboardUrgentMaintenanceRow = {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
}

export type DashboardStatDeltas = {
  boatsInAlert: number
  boatsWithEngine: number
  boatsWithSail: number
  boatsWithRig: number
  overdueCount: number
}

export type DashboardStats = {
  boats: number
  engines: number
  sails: number
  rigs: number
  urgentMaintenance: number
  deltas: DashboardStatDeltas
}
