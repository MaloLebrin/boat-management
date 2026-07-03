import type User from '#models/user'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class BoatPolicy extends BasePolicy {
  async before(user: User) {
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) {
      return true
    }
  }

  view(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  create(user: User): AuthorizerResponse {
    return user.organizationId !== null
  }

  edit(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  delete(_user: User, _boat: Boat): AuthorizerResponse {
    return false
  }

  manage(user: User, boat: Boat): AuthorizerResponse {
    return user.organizationId !== null && user.organizationId === boat.organizationId
  }

  // Non-admins may only delete reservations that are not yet confirmed; admins bypass via before().
  deleteReservation(user: User, boat: Boat, reservation: BoatReservation): AuthorizerResponse {
    if (user.organizationId === null || user.organizationId !== boat.organizationId) return false
    return reservation.status !== 'confirmed'
  }
}
