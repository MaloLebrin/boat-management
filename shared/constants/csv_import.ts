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
