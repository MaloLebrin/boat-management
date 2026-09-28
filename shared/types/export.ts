import type {
  DATA_EXPORT_STATUSES,
  DEFAULT_ACCOUNTING_ACCOUNTS,
  FLEET_EXPORT_TYPES,
} from '#shared/constants/exports'
import type { InvoiceKind, InvoiceStatus } from '#shared/types/invoice'
import type { ReservationPaymentStatus, ReservationStatus } from '#shared/types/reservation'

/** Exports comptables et exports flotte (#879). */

export type FleetExportType = (typeof FLEET_EXPORT_TYPES)[number]

export type DataExportStatus = (typeof DATA_EXPORT_STATUSES)[number]

export type AccountingAccountKey = keyof typeof DEFAULT_ACCOUNTING_ACCOUNTS

/** Période d'un export, bornes incluses, au format `YYYY-MM-DD`. */
export interface ExportPeriod {
  from: string | null
  to: string | null
}

/** Journal des ventes : factures et avoirs, jamais les devis. */
export interface InvoiceExportParams extends ExportPeriod {
  kind: Exclude<InvoiceKind, 'quote'> | null
  status: InvoiceStatus | null
  /** Une ligne par ligne de facture plutôt qu'une ligne par pièce. */
  detail: 'documents' | 'lines'
}

export interface FecExportParams {
  year: number
}

export interface ReservationExportParams extends ExportPeriod {
  boatId: number | null
  status: ReservationStatus | null
  paymentStatus: ReservationPaymentStatus | null
}

/** Période sur la date de création de la fiche. */
export type ClientExportParams = ExportPeriod

export interface MaintenanceHistoryExportParams extends ExportPeriod {
  q: string
  subject: string
  boatId: number | null
}

/** Paramètres d'un export flotte, tels que gardés dans `data_exports.params`. */
export type FleetExportParams =
  | InvoiceExportParams
  | FecExportParams
  | ReservationExportParams
  | ClientExportParams
  | MaintenanceHistoryExportParams

/** Fichier produit par un export, synchrone ou non. */
export interface ExportFile {
  filename: string
  contentType: string
  buffer: Buffer
  rowCount: number
}

/** Une ligne de `/settings/exports`. */
export interface DataExportRow {
  id: number
  type: FleetExportType
  status: DataExportStatus
  rowCount: number | null
  filename: string | null
  period: ExportPeriod | null
  requestedBy: string | null
  createdAt: string
  expiresAt: string
  /** URL signée, présente quand l'export est prêt et non expiré. */
  downloadUrl: string | null
}

/** Comptes et SIREN utilisés par le FEC, carte de `/settings/billing`. */
export interface AccountingSettings {
  siren: string | null
  accounts: Record<AccountingAccountKey, string>
  canManage: boolean
}

/** Une ligne d'écriture du FEC, montants en centimes. */
export interface FecLine {
  journalCode: string
  journalLib: string
  ecritureNum: string
  ecritureDate: string
  compteNum: string
  compteLib: string
  compAuxNum: string
  compAuxLib: string
  pieceRef: string
  pieceDate: string
  ecritureLib: string
  debitCents: number
  creditCents: number
  validDate: string
  currencyAmountCents: number | null
  currency: string
}
