import Boat from '#models/boat'
import Invoice from '#models/invoice'
import OrganizationMembership from '#models/organization_membership'
import type User from '#models/user'
import { InvalidBoatOwnerAssignmentError } from '#exceptions/boat_errors'

export default class BoatOwnerService {
  async listOwners(boat: Boat): Promise<User[]> {
    await boat.load('owners')
    return boat.owners
  }

  /** Utilisateurs `boat_owner` de l'organisation pas encore rattachés à ce bateau. */
  async listEligibleOwnerCandidates(boat: Boat): Promise<User[]> {
    const currentOwners = await this.listOwners(boat)
    const currentOwnerIds = currentOwners.map((owner) => owner.id)

    const memberships = await OrganizationMembership.query()
      .where('organizationId', boat.organizationId)
      .where('role', 'boat_owner')
      .whereNotIn('userId', currentOwnerIds.length ? currentOwnerIds : [0])
      .preload('user')

    return memberships.map((membership) => membership.user)
  }

  async attachOwner(boat: Boat, userId: number): Promise<void> {
    const membership = await OrganizationMembership.query()
      .where('userId', userId)
      .where('organizationId', boat.organizationId)
      .where('role', 'boat_owner')
      .first()

    if (!membership) {
      throw new InvalidBoatOwnerAssignmentError(
        `User ${userId} does not have the boat_owner role in organization ${boat.organizationId}`
      )
    }

    await boat.related('owners').attach([userId])
  }

  async detachOwner(boat: Boat, userId: number): Promise<void> {
    await boat.related('owners').detach([userId])
  }

  async listOwnedBoats(user: User): Promise<Boat[]> {
    return Boat.query()
      .whereHas('owners', (q) => q.where('userId', user.id))
      .orderBy('name')
  }

  async getOwnedBoat(user: User, boatId: number): Promise<Boat | null> {
    return Boat.query()
      .where('id', boatId)
      .whereHas('owners', (q) => q.where('userId', user.id))
      .first()
  }

  async listInvoicesForBoat(boat: Boat): Promise<Invoice[]> {
    return Invoice.query()
      .whereHas('reservation', (q) => q.where('boatId', boat.id))
      .preload('reservation')
      .orderBy('issuedAt', 'desc')
  }
}
