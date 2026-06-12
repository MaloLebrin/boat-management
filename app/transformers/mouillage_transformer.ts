import type Mouillage from '#models/mouillage'
import { toSpotForFront } from '#transformers/spot_transformer'

export function toMouillageForFront(m: Mouillage) {
  return {
    id: m.id,
    portId: m.portId,
    name: m.name,
    description: m.description,
    positionX: m.positionX,
    positionY: m.positionY,
    spots: (m.spots ?? []).map(toSpotForFront),
    createdAt: m.createdAt.toISO(),
    updatedAt: m.updatedAt?.toISO() ?? null,
  }
}
