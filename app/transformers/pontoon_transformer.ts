import type Pontoon from '#models/pontoon'
import { toSpotForFront } from '#transformers/spot_transformer'

export function toPontoonForFront(p: Pontoon) {
  return {
    id: p.id,
    portId: p.portId,
    name: p.name,
    description: p.description,
    positionX: p.positionX,
    positionY: p.positionY,
    spots: (p.spots ?? []).map(toSpotForFront),
    createdAt: p.createdAt.toISO(),
    updatedAt: p.updatedAt?.toISO() ?? null,
  }
}
