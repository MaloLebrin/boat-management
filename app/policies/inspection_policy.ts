import type User from '#models/user'
import type BoatReservation from '#models/boat_reservation'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import OrgScopedPolicy from '#utils/org_scoped_policy'

export default class InspectionPolicy extends OrgScopedPolicy {
  async view(user: User, reservation: BoatReservation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, reservation) && (await this.can(user, 'inspections.view'))
  }

  async create(user: User, reservation: BoatReservation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, reservation) && (await this.can(user, 'inspections.create'))
  }

  async edit(user: User, reservation: BoatReservation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, reservation) && (await this.can(user, 'inspections.edit'))
  }

  async delete(user: User, reservation: BoatReservation): Promise<AuthorizerResponse> {
    return this.sameOrg(user, reservation) && (await this.can(user, 'inspections.delete'))
  }
}
