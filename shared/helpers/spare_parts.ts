import {
  GENERIC_RETAILERS,
  SPARE_PARTS_RETAILERS,
} from '#shared/constants/spare_parts/spare_parts_content'
import {
  SPARE_PARTS_BRAND_SLUGS,
  type SparePartsBrandSlug,
  type SparePartsRetailerLink,
} from '#shared/types/spare_parts'

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
 * Traduit une marque du **catalogue moteur** (#573) en marque du corpus pièces
 * détachées, ou `null` quand le corpus v1 ne la couvre pas.
 *
 * Remplace l'ancien `resolveSparePartsBrand()`, dont la cascade de `if` codée
 * en dur ne connaissait que trois marques et ne savait rien faire d'un `Honda`
 * ou d'un `Volvo Penta`. La **normalisation** du texte libre a migré en base
 * (`EngineCatalogService.resolveBrand()`, résolution sur slug et alias) : les
 * écrans reçoivent désormais le slug déjà résolu par le contrôleur, et cette
 * fonction ne fait plus que la **couverture** — le catalogue compte des dizaines
 * de marques, le corpus de pièces trois. Un `Honda` est donc bien résolu comme
 * marque, et renvoie pourtant `null` ici : il n'a pas de contenu pièces.
 *
 * Les trois slugs du corpus sont ceux du catalogue, stables à vie de part et
 * d'autre — d'où le simple test d'appartenance.
 */
export function sparePartsBrandFromCatalogSlug(
  catalogBrandSlug: string | null | undefined
): SparePartsBrandSlug | null {
  if (!catalogBrandSlug) return null
  return (SPARE_PARTS_BRAND_SLUGS as readonly string[]).includes(catalogBrandSlug)
    ? (catalogBrandSlug as SparePartsBrandSlug)
    : null
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
