import vine from '@vinejs/vine'

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
    locale: vine.string().optional(),
  })
)
