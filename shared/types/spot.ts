/** Nature d'une place (#891) : à l'année, à la saison, de passage, technique (grue, carénage…). */
export type SpotKind = 'annual' | 'seasonal' | 'visitor' | 'technical'

/**
 * Statut **saisi** d'une place (#891). « Occupée » n'en fait pas partie : elle
 * se déduit d'un bateau amarré ou d'une escale en cours (`SpotEffectiveStatus`).
 */
export type SpotStatus = 'available' | 'reserved' | 'out_of_service'

/** Ce que le plan affiche : le statut saisi, ou `occupied` dès qu'un bateau est là. */
export type SpotEffectiveStatus = SpotStatus | 'occupied'

export type SpotPayload = {
  name: string
  description?: string | null
  lengthM?: number | null
  beamM?: number | null
  draftM?: number | null
  kind?: SpotKind
  status?: SpotStatus
  dailyRate?: number | null
  monthlyRate?: number | null
  annualRate?: number | null
  notes?: string | null
}
