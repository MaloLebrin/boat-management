import type { SpotKind, SpotStatus } from '../types/spot.js'
import type {
  MarinaStayStatus,
  MooringContractPeriodicity,
  MooringContractStatus,
} from '../types/marina.js'

/** Exploitation d'une marina (#891). */
export const SPOT_KINDS: readonly SpotKind[] = ['annual', 'seasonal', 'visitor', 'technical']
export const SPOT_STATUSES: readonly SpotStatus[] = ['available', 'reserved', 'out_of_service']

export const MARINA_STAY_STATUSES: readonly MarinaStayStatus[] = [
  'expected',
  'arrived',
  'departed',
  'invoiced',
  'cancelled',
]

/** Une escale « tient » sa place tant qu'elle est attendue ou en cours. */
export const MARINA_STAY_ACTIVE_STATUSES: readonly MarinaStayStatus[] = ['expected', 'arrived']

/**
 * Transitions qu'un geste de la capitainerie peut poser. `invoiced` n'y figure
 * pas : seule la génération de facture l'écrit, en même temps que `invoice_id`.
 */
export const MARINA_STAY_TRANSITIONS: Readonly<Record<MarinaStayStatus, MarinaStayStatus[]>> = {
  expected: ['arrived', 'cancelled'],
  arrived: ['departed'],
  departed: [],
  invoiced: [],
  cancelled: [],
}

/** Une escale se facture une fois le bateau arrivé (ou parti), jamais deux fois. */
export const MARINA_STAY_INVOICEABLE_STATUSES: readonly MarinaStayStatus[] = ['arrived', 'departed']

export const MOORING_CONTRACT_PERIODICITIES: readonly MooringContractPeriodicity[] = [
  'monthly',
  'quarterly',
  'annual',
]
export const MOORING_CONTRACT_STATUSES: readonly MooringContractStatus[] = ['active', 'terminated']

/** Mois couverts par une échéance de contrat. */
export const MOORING_PERIOD_MONTHS: Readonly<Record<MooringContractPeriodicity, number>> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
}

/** Un contrat qui se termine dans ce délai est signalé « à renouveler ». */
export const MOORING_RENEWAL_NOTICE_DAYS = 30

/** TVA pré-remplie sur les factures nées d'une escale ou d'un contrat — brouillon modifiable. */
export const MARINA_DEFAULT_TAX_RATE = 20

/** Échéance de paiement des factures de contrat, en jours après émission. */
export const MOORING_INVOICE_DUE_DAYS = 30

/** Rattrapage maximal d'échéances en un passage du job (garde-fou contre une date absurde). */
export const MOORING_MAX_CATCH_UP_PERIODS = 24

/** Escales terminées encore listées à la capitainerie, en jours après le départ. */
export const MARINA_STAY_HISTORY_DAYS = 60
