import vine from '@vinejs/vine'

/**
 * Un partage ne porte plus que l'`input` et la locale (#730) : le `breakdown`
 * est recalculé côté serveur par `computeSimulatorCosts`, jamais repris du
 * payload. La route est publique et non authentifiée — accepter des montants de
 * l'appelant revenait à laisser forger un lien qui attribue à FleetAi une
 * estimation qu'elle n'a pas produite. Un `breakdown` encore envoyé par un
 * client en cache est simplement ignoré (VineJS écarte les champs inconnus).
 */
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
    locale: vine.string().optional(),
  })
)
