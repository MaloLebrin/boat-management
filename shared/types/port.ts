export type PortAggRow = { port_id: number; count: string }

export type PortPayload = {
  name: string
  city?: string | null
  country?: string | null
  address?: string | null
  notes?: string | null
}
