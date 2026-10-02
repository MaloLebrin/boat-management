import type { SpotRow } from '../../../inertia/types/port'

/**
 * Place telle que la fiche port la sert, avec ses champs d'exploitation
 * (#891) à vide : une fixture qui oublierait `effectiveStatus` ferait
 * planter le plan, qui en tire la couleur de la place.
 */
export function makeSpotRow(overrides: Partial<SpotRow> = {}): SpotRow {
  const boat = overrides.boat ?? null
  return {
    id: 1,
    name: 'A1',
    description: null,
    boat,
    lengthM: null,
    beamM: null,
    draftM: null,
    kind: 'annual',
    status: 'available',
    effectiveStatus: boat ? 'occupied' : 'available',
    dailyRate: null,
    monthlyRate: null,
    annualRate: null,
    notes: null,
    stayGuestName: null,
    ...overrides,
  }
}
