export type OrgRole = 'admin' | 'member' | 'mechanic' | 'boat_owner'

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled'

/**
 * Business profile collected at signup (`organizations.type`).
 * Single source for `signupValidator` and for the `<BaseSelect>` options of
 * `SignupOrganizationFields.vue`; labels live under `auth.signup.orgTypes.*`.
 */
export const ORGANIZATION_TYPES = ['rental', 'school', 'marina', 'private'] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

/**
 * Declared fleet size bracket collected at signup (`organizations.fleet_size`).
 * Same contract as {@link ORGANIZATION_TYPES}; labels under
 * `auth.signup.fleetSizes.*`.
 */
export const FLEET_SIZES = ['1-4', '5-20', '21-50', '51+'] as const
export type FleetSize = (typeof FLEET_SIZES)[number]

/**
 * Payload accepted by `UserService.signupWithOrganization` — mirrors the fields
 * actually rendered by the signup form.
 */
export interface SignupInput {
  firstName: string
  lastName: string
  email: string
  password: string
  organizationName: string
  organizationType?: OrganizationType | null
  fleetSize?: FleetSize | null
}

/**
 * Payload accepted by `OrganizationService.createForSignup`.
 */
export interface CreateOrganizationForSignupInput {
  name: string
  type?: OrganizationType | null
  fleetSize?: FleetSize | null
}

export interface OrganizationMemberData {
  id: number
  userId: number
  fullName: string | null
  email: string
  role: OrgRole
}

export interface OrganizationInvitationData {
  id: number
  email: string
  role: OrgRole
  status: InvitationStatus
  invitedByName: string | null
  expiresAt: string
  createdAt: string
  boatIds: number[] | null
}
