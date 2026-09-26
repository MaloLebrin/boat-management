import type { BudgetEntryCategory } from '#shared/types/budget'
import type { ExpenseCsvHeader } from '#shared/types/csv'

/**
 * Plafond de lignes d'un import (#774).
 *
 * Le parse ne bornait rien : le validateur autorisait 5 Mo, soit plusieurs
 * dizaines de milliers de lignes, toutes parsées puis insérées en une seule
 * transaction. Ce plafond rend le comportement prévisible, et
 * `CSV_IMPORT_MAX_FILE_SIZE_MB` est calé dessus pour qu'une taille acceptée
 * par le validateur soit une taille réellement traitable — un `5mb` qui finit
 * systématiquement en refus est un piège.
 */
export const CSV_IMPORT_MAX_ROWS = 2_000
export const CSV_IMPORT_MAX_FILE_SIZE_MB = 2

/** Taille des lots d'insertion — voir `importMaintenanceRows`. */
export const CSV_IMPORT_INSERT_CHUNK = 200

/** Extensions acceptées par le validateur d'upload : CSV et classeur Excel. */
export const CSV_IMPORT_EXTNAMES = ['csv', 'xlsx'] as const

/**
 * Alias d'en-têtes du type `expenses`, en clés **normalisées** (minuscules,
 * sans accent — voir `normalizeImportToken`) : « Libellé », « Coût » ou
 * « Catégorie » y correspondent sans être listés avec leurs accents. La
 * première colonne du fichier qui correspond à une clé canonique gagne.
 */
export const EXPENSE_HEADER_ALIASES: Record<ExpenseCsvHeader, readonly string[]> = {
  date: ['date'],
  label: ['label', 'libelle', 'intitule', 'titre', 'title', 'designation'],
  amount: ['amount', 'montant', 'prix', 'cost', 'cout', 'total'],
  category: ['category', 'categorie', 'type'],
  description: ['description', 'notes', 'note', 'commentaire', 'comment'],
}

/**
 * Valeurs acceptées dans la colonne catégorie, en clés normalisées. Le slug
 * lui-même est toujours accepté ; les libellés FR/EN usuels aussi.
 */
export const EXPENSE_CATEGORY_ALIASES: Record<string, BudgetEntryCategory> = {
  maintenance: 'maintenance',
  entretien: 'maintenance',
  reparation: 'maintenance',
  fuel: 'fuel',
  carburant: 'fuel',
  gasoil: 'fuel',
  essence: 'fuel',
  documents: 'documents',
  document: 'documents',
  papiers: 'documents',
  assurance: 'documents',
  insurance: 'documents',
  port: 'port',
  escale: 'port',
  mooring: 'port',
  marina: 'port',
  equipment: 'equipment',
  equipement: 'equipment',
  materiel: 'equipment',
  other: 'other',
  autre: 'other',
  autres: 'other',
  divers: 'other',
}

/** Formats de date acceptés pour une dépense, tels qu'affichés dans l'aide. */
export const IMPORT_DATE_FORMATS_HINT = 'YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY'
