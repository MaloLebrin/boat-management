import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { spotFitsLength } from '../../shared/helpers/marina'
import type { MarinaStayStatus } from '../../shared/types/marina'
import type { SpotEffectiveStatus } from '../../shared/types/spot'
import type { PortShowDetail, SpotRow } from '~/types/port'

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'empty'

/**
 * Couleurs du plan SVG par statut de place (#891). Le plan est une
 * illustration autonome (exception de la charte) : il garde ses teintes
 * brutes, lisibles dans les deux thèmes, comme le brun de ses pontons.
 */
export const SPOT_STATUS_COLORS: Record<SpotEffectiveStatus, { fill: string; stroke: string }> = {
  available: { fill: 'transparent', stroke: '#5D4037' },
  occupied: { fill: '#1565C0', stroke: 'white' },
  reserved: { fill: '#F9A825', stroke: '#5D4037' },
  out_of_service: { fill: '#9E9E9E', stroke: '#616161' },
}

/** Contour d'une place adaptée au filtre de longueur. */
export const SPOT_MATCH_STROKE = '#2E7D32'

const STATUS_BADGES: Record<SpotEffectiveStatus, BadgeVariant> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
  out_of_service: 'empty',
}

const STAY_BADGES: Record<MarinaStayStatus, BadgeVariant> = {
  expected: 'warning',
  arrived: 'info',
  departed: 'neutral',
  invoiced: 'success',
  cancelled: 'empty',
}

/** Place du port, à plat, avec le nom de son ponton ou mouillage. */
export interface PortSpotOption {
  id: number
  label: string
  spot: SpotRow
}

export function useMarina() {
  const { t } = useT()
  const { formatLength } = useNumberFormat()

  /** `L 12 m · l 4 m · TE 2,5 m` — vide quand aucune dimension n'est connue. */
  function spotDimensions(spot: Pick<SpotRow, 'lengthM' | 'beamM' | 'draftM'>): string {
    return [
      spot.lengthM === null
        ? null
        : t('ports.spots.dims.length', { value: formatLength(spot.lengthM) }),
      spot.beamM === null ? null : t('ports.spots.dims.beam', { value: formatLength(spot.beamM) }),
      spot.draftM === null
        ? null
        : t('ports.spots.dims.draft', { value: formatLength(spot.draftM) }),
    ]
      .filter(Boolean)
      .join(' · ')
  }

  /** Infobulle SVG d'une place : nom, statut, dimensions, occupant. */
  function spotTooltip(spot: SpotRow): string {
    const occupant = spot.boat?.name ?? spot.stayGuestName
    return [
      `${spot.name} — ${t(`ports.spots.statuses.${spot.effectiveStatus}`)}`,
      spotDimensions(spot),
      occupant ? t('ports.spots.occupiedBy', { name: occupant }) : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  function statusBadge(status: SpotEffectiveStatus): BadgeVariant {
    return STATUS_BADGES[status]
  }

  function stayBadge(status: MarinaStayStatus): BadgeVariant {
    return STAY_BADGES[status]
  }

  /** Les places d'un port, préfixées de leur ponton/mouillage, pour un sélecteur. */
  function portSpotOptions(port: PortShowDetail): PortSpotOption[] {
    const groups = [...port.pontoons, ...port.mouillages]
    return groups.flatMap((group) =>
      group.spots.map((spot) => {
        const dims = spotDimensions(spot)
        return {
          id: spot.id,
          label: [`${group.name} · ${spot.name}`, dims].filter(Boolean).join(' — '),
          spot,
        }
      })
    )
  }

  /**
   * Places **libres** qui accueillent un bateau de cette longueur. Une place
   * sans longueur renseignée n'est pas proposée : on ne peut pas conclure.
   */
  function matchingSpotIds(port: PortShowDetail, boatLengthM: number | null): Set<number> {
    if (boatLengthM === null || !(boatLengthM > 0)) return new Set()
    return new Set(
      portSpotOptions(port)
        .filter(
          ({ spot }) =>
            spot.effectiveStatus === 'available' &&
            spotFitsLength(spot.lengthM, boatLengthM) === true
        )
        .map(({ id }) => id)
    )
  }

  return { spotDimensions, spotTooltip, statusBadge, stayBadge, portSpotOptions, matchingSpotIds }
}
