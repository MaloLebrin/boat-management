import vine from '@vinejs/vine'
import { NAVIGATION_TITLES } from '#shared/types/navigation_title'
import { RESERVATION_CREW_ROLES } from '#shared/types/crew'

export const createCrewMemberValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).optional(),
    phone: vine.string().trim().maxLength(50).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const updateCrewMemberValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).optional(),
    phone: vine.string().trim().maxLength(50).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const createCrewCertificationValidator = vine.create(
  vine.object({
    type: vine.enum(NAVIGATION_TITLES),
    referenceNumber: vine.string().trim().maxLength(100).optional(),
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)

export const syncNavigationLogCrewValidator = vine.create(
  vine.object({
    crew: vine.array(
      vine.object({
        crewMemberId: vine.number().withoutDecimals().positive(),
        role: vine.enum(['skipper', 'crew', 'passenger'] as const),
      })
    ),
  })
)

/** Affectation d'un équipier à une réservation (#883). */
export const assignReservationCrewValidator = vine.create(
  vine.object({
    crewMemberId: vine.number().withoutDecimals().positive(),
    role: vine.enum(RESERVATION_CREW_ROLES),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

/** Indisponibilité d'un équipier, jours inclus (#883). */
export const createCrewUnavailabilityValidator = vine.create(
  vine.object({
    startsOn: vine.date({ formats: ['YYYY-MM-DD'] }),
    endsOn: vine.date({ formats: ['YYYY-MM-DD'] }).afterOrSameAs('startsOn'),
    reason: vine.string().trim().maxLength(255).optional(),
  })
)

/** Période du calendrier d'équipage : `?from=YYYY-MM-DD`. */
export const crewPlanningQueryValidator = vine.create(
  vine.object({
    from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)
