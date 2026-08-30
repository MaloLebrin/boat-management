import {
  GENERIC_RETAILERS,
  SPARE_PART_ASSEMBLIES,
  SPARE_PARTS_RETAILERS,
} from '#shared/constants/spare_parts/spare_parts_content'
import { engineFamilyFromSignals } from '#shared/helpers/engine_family'
import {
  isEngineFamily,
  type EngineFamily,
  type EngineReferencePattern,
} from '#shared/types/engine_catalog'
import {
  SPARE_PARTS_BRAND_SLUGS,
  type PartAssemblySlug,
  type SparePartAssembly,
  type SparePartsBrandSlug,
  type SparePartsRetailerLink,
} from '#shared/types/spare_parts'

/**
 * Ensembles servis à un moteur dont la famille est inconnue : ce qu'on peut
 * affirmer de **n'importe quelle** motorisation. Un écran vide serait une
 * régression — l'utilisateur qui ne sait pas nommer sa pièce est justement
 * celui qui n'a pas renseigné sa famille.
 */
export const GENERIC_ASSEMBLY_SLUGS: readonly PartAssemblySlug[] = ['starting-charging', 'controls']

/** Signature minimale d'un moteur pour la résolution de famille. */
export interface SparePartsEngine {
  kind?: string | null
  fuel?: string | null
  strokeType?: string | null
  family?: string | null
}

/**
 * Famille retenue pour la nomenclature : celle **saisie** sur le moteur, sinon
 * celle que `kind`/`fuel`/`stroke_type` permettent de déduire (#574).
 *
 * Le repli sur la dérivation n'est pas de la redondance avec le backfill de la
 * migration : un moteur créé sans famille — l'API, un import, un formulaire
 * laissé vide — doit rendre la même chose qu'un moteur backfillé.
 */
export function resolveEngineFamily(engine: SparePartsEngine): EngineFamily | null {
  if (isEngineFamily(engine.family)) return engine.family
  return engineFamilyFromSignals(engine)
}

/**
 * Ensembles fonctionnels d'une famille de motorisation (#574) — l'ordre du
 * catalogue est conservé. Une famille inconnue ou absente retombe sur les
 * ensembles génériques, jamais sur une liste vide.
 */
export function assembliesForEngineFamily(
  family: EngineFamily | null
): readonly SparePartAssembly[] {
  const assemblies = Object.values(SPARE_PART_ASSEMBLIES)
  if (!family) {
    return assemblies.filter((assembly) => GENERIC_ASSEMBLY_SLUGS.includes(assembly.slug))
  }
  return assemblies.filter((assembly) => assembly.families.includes(family))
}

/** Ensembles fonctionnels servis à un moteur, famille résolue comprise. */
export function assembliesForEngine(engine: SparePartsEngine): readonly SparePartAssembly[] {
  return assembliesForEngineFamily(resolveEngineFamily(engine))
}

/**
 * Un moteur est éligible à l'identification des pièces détachées dès qu'au
 * moins un ensemble fonctionnel le concerne (#574).
 *
 * Remplace le `kind === 'outboard'` de #517, qui fermait le parcours aux
 * in-bord alors que ce sont eux qui portent la nomenclature la plus fournie.
 * C'est bien la **famille** qui décide, pas le `kind` : `kind` ne distingue ni
 * une ligne d'arbre d'un saildrive, ni un 2 temps d'un 4 temps.
 */
export function isSparePartsEligibleEngine(engine: SparePartsEngine): boolean {
  return assembliesForEngine(engine).length > 0
}

/** L'ensemble demandé s'applique-t-il bien à ce moteur ? (URL forgée, lien croisé) */
export function isAssemblyForEngine(engine: SparePartsEngine, slug: PartAssemblySlug): boolean {
  return assembliesForEngine(engine).some((assembly) => assembly.slug === slug)
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
 * Motif de référence Yamaha — le seul que #517 savait décoder, en dur.
 *
 * Il vit ici plutôt qu'en base parce qu'il a deux consommateurs : le seed de
 * `engine_brands.reference_pattern` (#575), et `yamahaReferenceExample()`
 * ci-dessous, que les écrans appellent sans requête. Les deux lisent donc
 * exactement la même définition.
 */
export const YAMAHA_REFERENCE_PATTERN: EngineReferencePattern = {
  template: '{modelCode}-{functionCode}-00',
  fallbackModelCode: '6E0',
  modelCodePattern: '^[0-9a-z]{2,4}$',
  explanationKey: 'parts.assembly.decode.text',
}

/**
 * Exemple de référence construit à partir du motif de la marque et du code
 * modèle du moteur — généralisation du cas Yamaha (#575).
 *
 * Le code plaque du moteur n'entre dans le gabarit que s'il respecte le motif
 * de la marque ; sinon on retombe sur le code de repli. C'est exactement la
 * règle de #517 (`F150 XCA` n'est pas un code plaque, `6E0` en est un), mais
 * portée par la marque au lieu d'être écrite dans la fonction.
 */
export function referenceExampleFromPattern(
  pattern: EngineReferencePattern,
  model: string | null,
  functionCode: string
): string {
  const trimmed = model?.trim() ?? ''
  const matches = trimmed !== '' && new RegExp(pattern.modelCodePattern, 'i').test(trimmed)
  const modelCode = matches ? trimmed.toUpperCase() : pattern.fallbackModelCode

  return pattern.template
    .replaceAll('{modelCode}', modelCode)
    .replaceAll('{functionCode}', functionCode)
}

/**
 * Exemple de référence Yamaha (`6E0-14301-00`) — cas particulier de
 * `referenceExampleFromPattern()`, conservé pour ce que les écrans en font
 * quand la marque ne porte pas encore son motif en base.
 */
export function yamahaReferenceExample(model: string | null, functionCode: string): string {
  return referenceExampleFromPattern(YAMAHA_REFERENCE_PATTERN, model, functionCode)
}
