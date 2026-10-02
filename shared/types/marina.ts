import type { DateTime } from 'luxon'
import type { InvoiceLineInput } from './invoice.js'

/** Date telle qu'un validateur ou un appelant la fournit (VineJS rend un `DateTime`). */
export type MarinaDateInput = DateTime | Date | string

/**
 * Escale sur une place (#891). `cancelled` n'est atteignable que depuis
 * `expected` ; `invoiced` seulement par la génération de facture.
 */
export type MarinaStayStatus = 'expected' | 'arrived' | 'departed' | 'invoiced' | 'cancelled'

/** Service consommé pendant une escale (électricité, eau, grutage…) — une ligne de facture. */
export type MarinaStayService = InvoiceLineInput

export interface MarinaStayRow {
  id: number
  spotId: number
  spotName: string
  boatId: number | null
  /** Nom affiché : le bateau de la flotte, sinon le visiteur. */
  guestName: string
  isVisitor: boolean
  guestLengthM: number | null
  visitorRegistration: string | null
  visitorContact: string | null
  clientId: number | null
  clientName: string | null
  arrivalOn: string
  departureOn: string
  nights: number
  status: MarinaStayStatus
  nightlyRate: number
  services: MarinaStayService[]
  /** Nuitées × tarif + services, hors taxes. */
  totalAmount: number
  invoiceId: number | null
  notes: string | null
}

export interface MarinaStayPayload {
  spotId: number
  boatId?: number | null
  clientId?: number | null
  visitorName?: string | null
  visitorLengthM?: number | null
  visitorRegistration?: string | null
  visitorContact?: string | null
  arrivalOn: string
  departureOn: string
  nightlyRate?: number | null
  services?: MarinaStayService[]
  notes?: string | null
}

/** Ce que le service d'escale accepte : le payload, dates sous toutes leurs formes. */
export type MarinaStayInput = Omit<MarinaStayPayload, 'arrivalOn' | 'departureOn'> & {
  arrivalOn: MarinaDateInput
  departureOn: MarinaDateInput
}

/** Avertissements non bloquants d'une création d'escale (rendus dans le flash). */
export type MarinaStayWarning = 'tooLong' | 'spotHasBoat'

export type MooringContractPeriodicity = 'monthly' | 'quarterly' | 'annual'
export type MooringContractStatus = 'active' | 'terminated'

export interface MooringContractRow {
  id: number
  spotId: number
  spotName: string
  clientId: number | null
  clientName: string | null
  boatId: number | null
  boatName: string | null
  startsOn: string
  endsOn: string | null
  periodicity: MooringContractPeriodicity
  amount: number
  nextInvoiceOn: string | null
  status: MooringContractStatus
  lastInvoiceId: number | null
  /** Le contrat arrive à échéance dans les 30 jours : à renouveler. */
  renewalDue: boolean
  notes: string | null
}

export interface MooringContractPayload {
  spotId: number
  clientId: number
  boatId?: number | null
  startsOn: string
  endsOn?: string | null
  periodicity: MooringContractPeriodicity
  amount: number
  notes?: string | null
}

export type MooringContractInput = Omit<MooringContractPayload, 'startsOn' | 'endsOn'> & {
  startsOn: MarinaDateInput
  endsOn?: MarinaDateInput | null
}

/** Indicateurs de la capitainerie (#891). */
export interface MarinaOccupancy {
  totalSpots: number
  /** Places occupées aujourd'hui : bateau amarré ou escale en cours. */
  occupiedNow: number
  /** Taux du jour, en pourcentage entier. */
  rateNow: number
  /** Taux du mois en cours : nuitées occupées / (places × nuits), en pourcentage entier. */
  rateMonth: number
}

export interface HarbourOfficeData {
  stays: MarinaStayRow[]
  contracts: MooringContractRow[]
  occupancy: MarinaOccupancy
  /** Escales attendues aujourd'hui (ids, dans `stays`). */
  arrivalsToday: number[]
  /** Escales qui partent aujourd'hui (ids, dans `stays`). */
  departuresToday: number[]
  today: string
}
