import type User from '#models/user'

/**
 * `boat_owner` has zero staff capabilities by design (cf. shared/types/permissions.ts) —
 * a denied `bouncer.authorize()` on a staff index would surface a raw 403. Since this role
 * always has a dedicated destination, redirect there instead (same behavior as
 * HomeController#index for `/`).
 */
export async function boatOwnerPortalRedirect(user: User): Promise<string | null> {
  if (!user.organizationId) return null
  const role = await user.getEffectiveRoleInOrg(user.organizationId)
  return role === 'boat_owner' ? '/owner/boats' : null
}
