import type User from '#models/user'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class BoatPolicy extends OrgScopedPolicy {
  async view(user: User, boat?: Boat): Promise<AuthorizerResponse> {
    if (boat && !this.sameOrg(user, boat)) return false
    return this.can(user, 'boats.view')
  }

  async create(user: User): Promise<AuthorizerResponse> {
    return this.can(user, 'boats.create')
  }

  async edit(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'boats.edit'))
  }

  async delete(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'boats.delete'))
  }

  async manage(user: User, boat: Boat): Promise<AuthorizerResponse> {
    return this.sameOrg(user, boat) && (await this.can(user, 'boats.manage'))
  }

  async deleteReservation(
    user: User,
    boat: Boat,
    reservation: BoatReservation
  ): Promise<AuthorizerResponse> {
    if (!this.sameOrg(user, boat)) return false
    if (!(await this.can(user, 'boats.reservations.delete'))) return false
    return reservation.status !== 'confirmed'
  }
}
