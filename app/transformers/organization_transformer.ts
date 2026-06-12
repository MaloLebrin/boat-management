import type Organization from '#models/organization'

export function toOrganizationForFront(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    createdAt: org.createdAt.toISO(),
  }
}
