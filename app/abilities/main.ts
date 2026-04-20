import { Bouncer } from '@adonisjs/bouncer'
import type Boat from '#models/boat'
import type User from '#models/user'

function sameOrganization(user: User, boat: Boat) {
  return user.organizationId !== null && user.organizationId === boat.organizationId
}

export const boatView = Bouncer.ability((user: User, boat: Boat) => {
  return sameOrganization(user, boat)
})

export const boatCreate = Bouncer.ability((user: User) => {
  return user.organizationId !== null
})

export const boatUpdate = Bouncer.ability((user: User, boat: Boat) => {
  return sameOrganization(user, boat)
})

export const boatDelete = Bouncer.ability((user: User, boat: Boat) => {
  return sameOrganization(user, boat)
})
