import {
  GENERIC_RETAILERS,
  SPARE_PARTS_RETAILERS,
} from '#shared/constants/spare_parts/spare_parts_content'
import type { SparePartsBrandSlug, SparePartsRetailerLink } from '#shared/types/spare_parts'

/**
 * Un moteur est éligible à l'identification des pièces détachées (#517) s'il
 * est hors-bord : le parcours (plaque signalétique, ensembles fonctionnels,
 * catalogues revendeurs) est propre à cette famille. Valeur issue de
 * `ENGINE_KIND_OPTIONS`.
 */
export function isSparePartsEligibleEngine(engine: { kind: string }): boolean {
  return engine.kind === 'outboard'
}

/**
 * Rattache la marque libre saisie sur le moteur (`Yamaha`, `evinrude 6cv`…)
 * à une marque du corpus v1, ou `null` si elle n'en fait pas partie.
 */
export function resolveSparePartsBrand(brand: string | null): SparePartsBrandSlug | null {
  if (!brand) return null
  const normalized = brand.toLowerCase()
  if (normalized.includes('yamaha')) return 'yamaha'
  if (/johnson|evinrude|\bomc\b/.test(normalized)) return 'johnson-evinrude'
  if (/mercury|mariner/.test(normalized)) return 'mercury-mariner'
  return null
}

/** Liens catalogues revendeurs pour une marque (génériques si inconnue). */
export function retailerLinksForBrand(
  brand: SparePartsBrandSlug | null
): readonly SparePartsRetailerLink[] {
  return brand ? SPARE_PARTS_RETAILERS[brand] : GENERIC_RETAILERS
}

/**
 * Exemple de référence Yamaha (`6E0-14301-00`) construit à partir du code
 * modèle du moteur quand il ressemble à un code Yamaha, sinon sur l'exemple
 * de l'issue (`6E0`).
 */
export function yamahaReferenceExample(model: string | null, functionCode: string): string {
  const modelCode =
    model && /^[0-9a-z]{2,4}$/i.test(model.trim()) ? model.trim().toUpperCase() : '6E0'
  return `${modelCode}-${functionCode}-00`
}
