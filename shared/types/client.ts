export type ClientStatus = 'active' | 'inactive' | 'blacklisted'

export type ClientPermitType = 'coastal' | 'offshore' | 'inland' | 'other'

export interface CreateClientPayload {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  navigationPermitNumber?: string | null
  navigationPermitType?: ClientPermitType | null
  status?: ClientStatus
  notes?: string | null
}

export interface UpdateClientPayload {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  navigationPermitNumber?: string | null
  navigationPermitType?: ClientPermitType | null
  status?: ClientStatus
  notes?: string | null
}

/** DTO returned to the frontend (dates serialized to ISO strings). */
export interface ClientRow {
  id: number
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  phone: string | null
  address: string | null
  navigationPermitNumber: string | null
  navigationPermitType: ClientPermitType | null
  status: ClientStatus
  notes: string | null
  /** GDPR consent timestamp — captured in a later lot (#276), display-only here. */
  gdprConsentAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type ClientSortField = 'lastName' | 'createdAt' | 'status'
export type ClientSortDirection = 'asc' | 'desc'

/** Normalized, always-defined filters echoed back to the list page. */
export interface ClientListFilters {
  q: string
  status: ClientStatus | ''
  sort: ClientSortField
  direction: ClientSortDirection
  page: number
  perPage: number
}

export interface ClientListMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface ClientsPaginated {
  data: ClientRow[]
  meta: ClientListMeta
}

/** Lightweight option for pickers (reservation form in a later lot). */
export interface ClientOption {
  id: number
  fullName: string
  status: ClientStatus
}
