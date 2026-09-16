import type Boat from '#models/boat'
import type User from '#models/user'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * Shared helpers for the browser (e2e) suite.
 *
 * Authentication follows the same strategy as the functional tests:
 * users are built via factories (see `createAdminUser`) and logged in
 * programmatically with `browserContext.loginAs(user)` (web session guard),
 * so specs never have to replay the login form except when the login flow
 * itself is what's under test.
 */

export { createAdminUser, createEnterpriseAdminUser }

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
  // createAdminUser / createEnterpriseAdminUser always attach an organization.
  return BoatFactory.merge({ organizationId: user.organizationId!, ...overrides }).create()
}

/**
 * Create a port inside the given user's organization.
 */
export function createPortForUser(user: User, name?: string) {
  return PortFactory.merge({
    organizationId: user.organizationId!,
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
