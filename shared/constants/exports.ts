/**
 * Exports comptables et exports flotte (#879).
 */

/** Exports flotte : une ligne par entité de toute l'organisation. */
export const FLEET_EXPORT_TYPES = [
  'invoices',
  'invoice_lines',
  'fec',
  'reservations',
  'clients',
  'maintenance_history',
] as const

/**
 * Au-delà de ce nombre de lignes, l'export ne part plus dans la réponse HTTP :
 * il est généré par le job `GenerateExport`, gardé en base et signalé par une
 * notification `export.ready`.
 */
export const EXPORT_ASYNC_THRESHOLD = 5000

/** Durée de conservation d'un export généré en arrière-plan. */
export const EXPORT_RETENTION_DAYS = 7

/** Nombre d'exports listés sur `/settings/exports`. */
export const EXPORT_LIST_LIMIT = 50

export const DATA_EXPORT_STATUSES = ['pending', 'ready', 'failed'] as const

/**
 * Comptes par défaut du FEC — plan comptable général : 706 prestations de
 * services, 44571 TVA collectée, 411 clients, 512 banque. Modifiables dans
 * `/settings/billing`.
 */
export const DEFAULT_ACCOUNTING_ACCOUNTS = {
  sales: '706',
  vat: '44571',
  customers: '411',
  bank: '512',
} as const

/** Un numéro de compte : chiffres, puis éventuellement lettres (sous-comptes). */
export const ACCOUNTING_ACCOUNT_PATTERN = /^\d[\dA-Z]{1,19}$/

/** SIREN : 9 chiffres, en tête du nom du fichier FEC. */
export const SIREN_PATTERN = /^\d{9}$/

/** Codes journaux du FEC : ventes et banque. */
export const FEC_JOURNALS = { sales: 'VE', bank: 'BQ' } as const

/** Première année proposée au sélecteur d'exercice du FEC. */
export const FEC_MIN_YEAR = 2000

/** Statuts filtrables du journal des ventes : une pièce émise, jamais un brouillon. */
export const INVOICE_EXPORT_STATUSES = ['sent', 'paid', 'overdue', 'cancelled', 'credited'] as const
