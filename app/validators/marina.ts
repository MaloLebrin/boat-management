import vine from '@vinejs/vine'
import { MOORING_CONTRACT_PERIODICITIES } from '#shared/constants/marina'

const isoDate = () => vine.date({ formats: ['YYYY-MM-DD'] })
const money = () => vine.number().min(0).max(9_999_999)

/**
 * Escale (#891). Bateau de la flotte **ou** visiteur : le service refuse
 * l'absence des deux (`visitorName` requis sans `boatId`). L'organisation et
 * le port viennent de l'URL, jamais du corps.
 */
export const marinaStayValidator = vine.create(
  vine.object({
    spotId: vine.number().positive().withoutDecimals(),
    boatId: vine.number().positive().withoutDecimals().nullable().optional(),
    clientId: vine.number().positive().withoutDecimals().nullable().optional(),
    visitorName: vine.string().trim().maxLength(150).nullable().optional(),
    visitorLengthM: vine.number().positive().max(999).nullable().optional(),
    visitorRegistration: vine.string().trim().maxLength(50).nullable().optional(),
    visitorContact: vine.string().trim().maxLength(255).nullable().optional(),
    arrivalOn: isoDate(),
    departureOn: isoDate().afterField('arrivalOn', { compare: 'day' }),
    nightlyRate: money().nullable().optional(),
    services: vine
      .array(
        vine.object({
          label: vine.string().trim().minLength(1).maxLength(200),
          quantity: vine.number().positive().max(100_000),
          unitPrice: money(),
        })
      )
      .maxLength(30)
      .optional(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)

export const marinaStayStatusValidator = vine.create(
  vine.object({
    status: vine.enum(['arrived', 'departed', 'cancelled'] as const),
  })
)

export const mooringContractValidator = vine.create(
  vine.object({
    spotId: vine.number().positive().withoutDecimals(),
    clientId: vine.number().positive().withoutDecimals(),
    boatId: vine.number().positive().withoutDecimals().nullable().optional(),
    startsOn: isoDate(),
    endsOn: isoDate().afterField('startsOn', { compare: 'day' }).nullable().optional(),
    periodicity: vine.enum(MOORING_CONTRACT_PERIODICITIES),
    amount: money().positive(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
  })
)
