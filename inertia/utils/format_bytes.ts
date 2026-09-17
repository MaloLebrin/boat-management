/** Libellés d'unités, traduits par l'appelant — jamais figés ici. */
export interface ByteUnitLabels {
  bytes: string
  kb: string
  mb: string
  gb: string
}

const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

/**
 * Taille d'un fichier, telle qu'affichée dans les listes et modales de
 * documents : `512 o`, `1.5 Ko`, `2.3 Mo`. Une décimale dès le kilo-octet,
 * parce qu'un document pèse rarement un compte rond et que l'écart entre
 * deux versions doit se voir. Pas de palier Go : un document uploadé ne
 * l'atteint pas.
 */
export function renderFileSize(bytes: number, units: ByteUnitLabels): string {
  if (bytes < KB) return `${bytes} ${units.bytes}`
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} ${units.kb}`
  return `${(bytes / MB).toFixed(1)} ${units.mb}`
}

/**
 * Volume de stockage, tel qu'affiché par la jauge de quota : `640 Ko`,
 * `12 Mo`, `1.4 Go`. Arrondi à l'entier jusqu'au méga-octet — une jauge se lit
 * d'un coup d'œil, la décimale y est du bruit — et palier Go, que le quota
 * d'une organisation dépasse.
 *
 * Pas de palier octet : sous le kilo-octet, un stockage s'affiche `0 Ko`, ce
 * qui est l'information utile (« rien de consommé »).
 */
export function renderStorageSize(bytes: number, units: ByteUnitLabels): string {
  if (bytes < MB) return `${Math.round(bytes / KB)} ${units.kb}`
  if (bytes < GB) return `${Math.round(bytes / MB)} ${units.mb}`
  return `${(bytes / GB).toFixed(1)} ${units.gb}`
}
