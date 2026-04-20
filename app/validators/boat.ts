import vine from '@vinejs/vine'

export const propulsionTypes = ['sailboat', 'motorboat', 'catamaran', 'rib', 'other'] as const
export const hullMaterials = ['fiberglass', 'aluminum', 'steel', 'wood', 'carbon', 'other'] as const

export const engineKinds = ['inboard', 'outboard', 'electric', 'hybrid', 'other'] as const
export const engineFuels = ['diesel', 'essence', 'electric', 'other'] as const

export const sailTypes = [
  'main',
  'genoa',
  'jib',
  'spinnaker',
  'gennaker',
  'storm_jib',
  'other',
] as const
export const rigTypes = [
  'sloop',
  'cutter',
  'ketch',
  'yawl',
  'schooner',
  'cat_rig',
  'other',
] as const

export const createBoatValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  registrationNumber: vine.string().trim().maxLength(64).nullable().optional(),
  propulsionType: vine.enum(propulsionTypes).nullable().optional(),
  type: vine.string().trim().maxLength(64).nullable().optional(),

  manufacturedAt: vine.date().nullable().optional(),

  lengthM: vine.number().positive().nullable().optional(),
  beamM: vine.number().positive().nullable().optional(),
  draftM: vine.number().positive().nullable().optional(),
  mastHeightM: vine.number().positive().nullable().optional(),

  hullMaterial: vine.enum(hullMaterials).nullable().optional(),
  yearBuilt: vine.number().withoutDecimals().range([1800, 2200]).nullable().optional(),
  manufacturer: vine.string().trim().maxLength(120).nullable().optional(),
  model: vine.string().trim().maxLength(120).nullable().optional(),

  engines: vine
    .array(
      vine.object({
        kind: vine.enum(engineKinds),
        fuel: vine.enum(engineFuels).nullable().optional(),
        brand: vine.string().trim().maxLength(120).nullable().optional(),
        model: vine.string().trim().maxLength(120).nullable().optional(),
        serialNumber: vine.string().trim().maxLength(120).nullable().optional(),
        manufacturedAt: vine.date().nullable().optional(),
        powerHp: vine.number().positive().nullable().optional(),
        hours: vine.number().withoutDecimals().min(0).nullable().optional(),
      })
    )
    .optional(),

  sails: vine
    .array(
      vine.object({
        sailType: vine.enum(sailTypes),
        manufacturedAt: vine.date().nullable().optional(),
        areaM2: vine.number().positive().nullable().optional(),
        material: vine.string().trim().maxLength(120).nullable().optional(),
        reefPoints: vine.number().withoutDecimals().min(0).nullable().optional(),
      })
    )
    .optional(),

  rig: vine
    .object({
      rigType: vine.enum(rigTypes),
      manufacturedAt: vine.date().nullable().optional(),
      mastCount: vine.number().withoutDecimals().min(0).nullable().optional(),
      spreaders: vine.number().withoutDecimals().min(0).nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const updateBoatValidator = createBoatValidator
