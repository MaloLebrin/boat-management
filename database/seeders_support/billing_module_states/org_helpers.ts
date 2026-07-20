import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import UserService from '#services/user_service'
import type { PlanTier } from '#shared/types/plan'
import app from '@adonisjs/core/services/app'
import { TEST_PASSWORD } from '#database/seeders_support/billing_module_states/constants'

/**
 * Ensures a user + org exist for the given email, on the given plan.
 * On first run: creates via signupWithOrganization then patches the plan.
 * On subsequent runs: updates the plan only.
 */
export async function ensureOwner(
  email: string,
  fullName: string,
  plan: PlanTier
): Promise<{ user: User; org: Organization }> {
  let user = await User.query().where('email', email).first()

  if (!user) {
    const userService = await app.container.make(UserService)
    const result = await userService.signupWithOrganization({
      email,
      password: TEST_PASSWORD,
      fullName,
    })
    user = result.user
    await result.organization.merge({ plan }).save()
    return { user, org: result.organization }
  }

  const org = await Organization.findOrFail(user.organizationId!)
  if (org.plan !== plan) {
    await org.merge({ plan }).save()
  }
  return { user, org }
}

/**
 * Creates a team member user directly attached to a given org.
 * Skips if a user with that email already exists.
 */
export async function ensureTeamMember(
  email: string,
  fullName: string,
  orgId: number,
  role: 'admin' | 'member'
): Promise<void> {
  const existing = await User.query().where('email', email).first()

  let userId: number
  if (!existing) {
    const member = await User.create({
      email,
      password: TEST_PASSWORD,
      fullName,
      organizationId: orgId,
    })
    userId = member.id
  } else {
    userId = existing.id
  }

  const hasMembership = await OrganizationMembership.query()
    .where('userId', userId)
    .where('organizationId', orgId)
    .first()

  if (!hasMembership) {
    await OrganizationMembership.create({ userId, organizationId: orgId, role })
  }
}

/**
 * Creates a boat if none with that name exists in the org.
 */
export async function ensureBoat(
  orgId: number,
  name: string,
  extra: Partial<Parameters<typeof Boat.create>[0]> = {}
): Promise<void> {
  const exists = await Boat.query().where('organizationId', orgId).where('name', name).first()
  if (!exists) {
    await Boat.create({ organizationId: orgId, name, ...extra })
  }
}

export async function ensureBoats(orgId: number, count: number, namePrefix: string): Promise<void> {
  for (let i = 1; i <= count; i += 1) {
    await ensureBoat(orgId, `${namePrefix} ${i}`, {
      propulsionType: 'sailboat',
      lengthM: 8 + i * 0.3,
      hullMaterial: 'fiberglass',
      yearBuilt: 2015 + i,
    })
  }
}
