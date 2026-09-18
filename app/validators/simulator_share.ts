import vine from '@vinejs/vine'
import { APP_LOCALES } from '#shared/helpers/locale_path'

export const simulatorShareValidator = vine.compile(
  vine.object({
    input: vine.object({
      boatType: vine.enum(['motorboat', 'sailboat', 'catamaran', 'rib']),
      lengthM: vine.number().min(1).max(100),
      yearBuilt: vine.number().min(1900).max(new Date().getFullYear()),
      navigationCategory: vine.enum(['A', 'B', 'C', 'D']),
      hasDedicatedEngine: vine.boolean(),
      hullWear: vine.enum(['new', 'good', 'worn', 'to_replace']),
      engineWear: vine.enum(['new', 'good', 'worn', 'to_replace']).nullable(),
      safetyWear: vine.enum(['new', 'good', 'worn', 'to_replace']),
      riggingWear: vine.enum(['new', 'good', 'worn', 'to_replace']).nullable(),
      winteringZone: vine.enum(['covered', 'outdoor', 'sea']).nullable().optional(),
    }),
    breakdown: vine.object({
      categories: vine.array(
        vine.object({
          key: vine.string(),
          minCost: vine.number(),
          maxCost: vine.number(),
        })
      ),
      totalMin: vine.number(),
      totalMax: vine.number(),
    }),
    // Bornée à la paire de locales de l'app (#729) : la colonne est un
    // `varchar(10)`, et la page de lecture type sa prop `'en' | 'fr'`. Un
    // `vine.string()` laissait passer onze caractères — 500 à l'insertion — et
    // une locale bidon plus courte jusqu'à la prop.
    locale: vine.enum(APP_LOCALES).optional(),
  })
)
