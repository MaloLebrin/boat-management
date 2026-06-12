import type Spot from '#models/spot'

export function toSpotForFront(s: Spot) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    pontoonId: s.pontoonId,
    mouillageId: s.mouillageId,
    organizationId: s.organizationId,
    createdAt: s.createdAt.toISO(),
    updatedAt: s.updatedAt?.toISO() ?? null,
  }
}
