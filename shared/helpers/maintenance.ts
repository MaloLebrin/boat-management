import {
  ENGINE_KIND_OPTIONS,
  SAIL_MATERIAL_OPTIONS,
} from '#shared/constants/boats/boat_form_options'

export { toDateTime } from '#shared/helpers/date'

interface EngineLike {
  brand: string | null
  model: string | null
  serialNumber: string | null
  kind: string
}

/**
 * Caption stored with an engine maintenance event. When the engine carries no
 * brand/model/serial number the caption falls back to the `kind` enum token,
 * which is locale-independent on purpose: the display layer translates it (see
 * `isEngineKindCaption`), so a stored caption never freezes one language — #472.
 */
export function buildEngineCaption(engine: EngineLike): string {
  const bits = [engine.brand, engine.model, engine.serialNumber].filter(Boolean)
  const label = bits.join(' ').trim()
  return label || engine.kind
}

/**
 * True when an engine caption is exactly an engine `kind` enum token, and must
 * therefore be translated before being shown instead of printed as-is (#472).
 */
export function isEngineKindCaption(caption: string | null | undefined): caption is string {
  return !!caption && ENGINE_KIND_OPTIONS.some((option) => option.value === caption)
}

interface SailLike {
  sailType: string
  material: string | null
  areaM2: number | null
}

export function buildSailCaption(sail: SailLike): string {
  // Depuis #578, `material` est un slug d'enum (`nylon_spi`) : le caption étant
  // stocké tel quel, on y écrit le libellé de repli EN plutôt que le slug. La
  // traduction complète des captions stockés est le chantier #472.
  const materialLabel = sail.material
    ? (SAIL_MATERIAL_OPTIONS.find((option) => option.value === sail.material)?.label ??
      sail.material)
    : null

  const bits = [
    sail.sailType,
    materialLabel,
    sail.areaM2 !== null ? `${sail.areaM2} m²` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

interface PartLike {
  unitPrice: number | null | undefined
  quantity: number | null | undefined
}

export function computeTotalCost(parts: PartLike[]): number | null {
  let total = 0
  let hasPrice = false
  for (const p of parts) {
    if (p.unitPrice !== null && p.unitPrice !== undefined) {
      hasPrice = true
      total += p.unitPrice * (p.quantity ?? 1)
    }
  }
  return hasPrice ? Math.round(total * 100) / 100 : null
}
