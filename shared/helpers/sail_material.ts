import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import { SAIL_MATERIALS, type SailMaterial } from '#shared/types/boat'

/**
 * Normalisation best-effort du matériau de voile (#578) — helper pur, partagé
 * par la migration `1843000002000_normalize_boat_sails_material` et ses tests.
 *
 * Les motifs s'appliquent sur la forme **normalisée** de la saisie (minuscule,
 * sans accent, sans séparateur — cf. `normalizeCatalogText`) : `Hydra Net®`
 * devient `hydranet`. L'ordre compte, du plus spécifique au plus générique —
 * `membrane polyester` doit tomber sur `membrane`, pas sur `dacron`.
 */
const LEGACY_MATERIAL_PATTERNS: ReadonlyArray<readonly [RegExp, SailMaterial]> = [
  [/hydranet/, 'hydranet'],
  [/cuben|ultrape|dyneema/, 'cuben'],
  [/membrane|3d[il]|dfi|d4|carbon|aramid|kevlar|vectran/, 'membrane'],
  [/lamin|mylar|pentex|stratifi/, 'laminate'],
  [/nylon|spinnaker|spi/, 'nylon_spi'],
  [/dacron|polyester|tergal/, 'dacron'],
  [/^autres?$|^others?$/, 'other'],
]

/**
 * Rapproche une saisie libre d'un slug `SAIL_MATERIALS`. Renvoie `null` quand
 * rien ne matche : la migration bascule alors sur `other` en recopiant la
 * valeur d'origine dans `notes` — aucune information perdue.
 */
export function normalizeSailMaterial(raw: string | null | undefined): SailMaterial | null {
  if (!raw) return null

  const normalized = normalizeCatalogText(raw)
  if (!normalized) return null

  // Une valeur déjà écrite avec un slug du vocabulaire passe telle quelle
  // (`nylon_spi` se normalise en `nylonspi`, d'où la comparaison des deux formes).
  const exact = SAIL_MATERIALS.find((material) => normalizeCatalogText(material) === normalized)
  if (exact) return exact

  for (const [pattern, material] of LEGACY_MATERIAL_PATTERNS) {
    if (pattern.test(normalized)) return material
  }

  return null
}

/**
 * Ligne ajoutée aux notes quand la valeur d'origine n'est pas mappable —
 * partagée entre la migration et son test pour verrouiller le format.
 */
export function legacyMaterialNote(raw: string): string {
  return `Matériau saisi : ${raw}`
}
