export type RentalContractStatus = 'draft' | 'sent' | 'signed'

export interface RentalContractRow {
  id: number
  reservationId: number
  clientId: number | null
  status: RentalContractStatus
  signedAt: string | null
  createdAt: string
  boatId: number
  boatName: string
  clientName: string
  clientEmail: string | null
  reservationStart: string
  reservationEnd: string
  hasSignedDocument: boolean
  mediaFilename: string | null
}
