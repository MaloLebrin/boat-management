export { toDateTime } from '#shared/helpers/date'

interface EngineLike {
  brand: string | null
  model: string | null
  serialNumber: string | null
  kind: string
}

export function buildEngineCaption(engine: EngineLike): string {
  const bits = [engine.brand, engine.model, engine.serialNumber].filter(Boolean)
  const label = bits.join(' ').trim()
  return label || engine.kind
}

interface SailLike {
  sailType: string
  material: string | null
  areaM2: number | null
}

export function buildSailCaption(sail: SailLike): string {
  const bits = [
    sail.sailType,
    sail.material,
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
