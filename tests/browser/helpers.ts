import type Boat from '#models/boat'
import type User from '#models/user'
import OrganizationMembership from '#models/organization_membership'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Shared helpers for the browser (e2e) suite.
 *
 * Authentication follows the same strategy as the functional tests:
 * users are built via factories (see `createAdminUser`) and logged in
 * programmatically with `browserContext.loginAs(user)` (web session guard),
 * so specs never have to replay the login form except when the login flow
 * itself is what's under test.
 */

export { createAdminUser }

/**
 * Like `createAdminUser` but on the `enterprise` plan, so plan-gated screens
 * (AI settings, branding/white-label, clients) are reachable. Used by the
 * authenticated smoke test to cover every main screen.
 */
export async function createEnterpriseAdminUser(): Promise<User> {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

/**
 * The plaintext password every factory-built user is created with
 * (see `database/factories/user_factory.ts`). Needed by the auth spec
 * that drives the real `/login` form.
 */
export const DEFAULT_PASSWORD = 'Password123!'

/**
 * Create a boat inside the given user's organization so it is visible to
 * that user once authenticated.
 */
export function createBoatForUser(user: User, overrides: Partial<Boat> = {}): Promise<Boat> {
  return BoatFactory.merge({ organizationId: user.organizationId, ...overrides }).create()
}

/**
 * Create a port inside the given user's organization.
 */
export function createPortForUser(user: User, name?: string) {
  return PortFactory.merge({
    organizationId: user.organizationId,
    ...(name ? { name } : {}),
  }).create()
}

/**
 * Create a performed maintenance event attached to a boat. Used to exercise
 * the read path of `/maintenance/history` end-to-end without driving the
 * multi-step boat-show tab UI.
 */
export function createMaintenanceEventForBoat(boat: Boat, overrides: Record<string, unknown> = {}) {
  return BoatMaintenanceEventFactory.merge({ boatId: boat.id, ...overrides }).create()
}
