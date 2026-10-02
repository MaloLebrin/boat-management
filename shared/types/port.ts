import type { SpotEffectiveStatus, SpotKind, SpotStatus } from './spot.js'

export type PortAggRow = { port_id: number; count: string }

/**
 * Port de l'organisation réduit à ce qu'il faut pour une liste de suggestions
 * (#579) : les champs texte qui désignent un port (`boats.home_port`,
 * `boat_port_stays.port_name`) restent libres, la liste ne fait qu'assister la
 * saisie.
 */
export type PortNameOption = { id: number; name: string }

export type PortPayload = {
  name: string
  city?: string | null
  country?: string | null
  address?: string | null
  notes?: string | null
}

/** Place telle que la fiche port la sert (plan, listes, capitainerie — #891). */
export interface PortSpotRow {
  id: number
  name: string
  description: string | null
  boat: { id: number; name: string } | null
  lengthM: number | null
  beamM: number | null
  draftM: number | null
  kind: SpotKind
  status: SpotStatus
  effectiveStatus: SpotEffectiveStatus
  dailyRate: number | null
  monthlyRate: number | null
  annualRate: number | null
  notes: string | null
  /** Invité d'une escale en cours (bateau de la flotte ou visiteur), sinon `null`. */
  stayGuestName: string | null
}
