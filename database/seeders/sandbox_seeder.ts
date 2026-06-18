import Boat from '#models/boat'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Organization from '#models/organization'
import User from '#models/user'
import BoatEquipmentService from '#services/boat_equipment_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatService from '#services/boat_hull_service'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@fleetai.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234'
const DEMO_ORG_SLUG = 'marina-demo'

export async function seedDemoData() {
  const today = DateTime.now().startOf('day')

  let org = await Organization.query().where('slug', DEMO_ORG_SLUG).first()
  if (!org) {
    org = await Organization.create({
      name: 'Marina Démo',
      slug: DEMO_ORG_SLUG,
      plan: 'pro',
    })
  }

  let user = await User.query().where('email', DEMO_EMAIL).first()
  if (!user) {
    user = await User.create({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      fullName: 'Compte Démo',
      organizationId: org.id,
    })
  }

  const boatService = await app.container.make(BoatService)
  const equipmentService = await app.container.make(BoatEquipmentService)
  const maintenanceService = await app.container.make(BoatMaintenanceService)

  const boatDefs = [
    {
      name: 'Albatros',
      propulsionType: 'sailboat' as const,
      lengthM: 9.5,
      beamM: 3.2,
      draftM: 1.6,
      mastHeightM: 14.0,
      hullMaterial: 'fiberglass',
      yearBuilt: 2005,
      manufacturer: 'Bénéteau',
      model: 'Oceanis 31',
    },
    {
      name: 'Marin du Vent',
      propulsionType: 'sailboat' as const,
      lengthM: 12.0,
      beamM: 3.9,
      draftM: 1.9,
      mastHeightM: 18.0,
      hullMaterial: 'fiberglass',
      yearBuilt: 2012,
      manufacturer: 'Jeanneau',
      model: 'Sun Odyssey 389',
    },
    {
      name: 'Cap Mistral',
      propulsionType: 'motorboat' as const,
      lengthM: 7.2,
      beamM: 2.8,
      draftM: 0.6,
      hullMaterial: 'fiberglass',
      yearBuilt: 2018,
      manufacturer: 'Quicksilver',
      model: '675 Activ',
    },
    {
      name: 'Étoile du Port',
      propulsionType: 'sailboat' as const,
      lengthM: 8.2,
      beamM: 2.9,
      draftM: 1.4,
      mastHeightM: 12.5,
      hullMaterial: 'wood',
      yearBuilt: 1992,
      manufacturer: 'Dufour',
      model: 'Classic 27',
    },
    {
      name: 'Tempête Douce',
      propulsionType: 'motorboat' as const,
      lengthM: 5.8,
      beamM: 2.3,
      draftM: 0.45,
      hullMaterial: 'aluminum',
      yearBuilt: 2020,
      manufacturer: 'Zodiac',
      model: 'Pro 5.8',
    },
  ]

  for (const def of boatDefs) {
    const existing = await Boat.query()
      .where('organizationId', org.id)
      .where('name', def.name)
      .first()
    if (existing) continue

    const boat = await boatService.createForUser(user, def)

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')

    if (def.propulsionType === 'sailboat') {
      if (boat.engines.length === 0) {
        await equipmentService.createEngine(user, boat, {
          kind: 'inboard',
          fuel: 'diesel',
          brand: 'Volvo',
          model: 'D1-20',
          powerHp: 20,
          hours: Math.floor(Math.random() * 600) + 100,
          manufacturedAt: `${def.yearBuilt + 1}-06-01`,
        })
      }
      if (boat.sails.length === 0) {
        await equipmentService.createSail(user, boat, {
          sailType: 'main',
          areaM2: def.lengthM * 1.4,
          material: 'dacron',
          reefPoints: 2,
          manufacturedAt: `${def.yearBuilt}-04-01`,
        })
        await equipmentService.createSail(user, boat, {
          sailType: 'genoa',
          areaM2: def.lengthM * 1.7,
          material: 'dacron',
          reefPoints: 0,
          manufacturedAt: `${def.yearBuilt}-04-01`,
        })
      }
      if (!boat.rig) {
        await equipmentService.upsertRig(user, boat, {
          rigType: 'sloop',
          mastCount: 1,
          spreaders: 2,
          manufacturedAt: `${def.yearBuilt}-01-01`,
        })
      }
    } else {
      if (boat.engines.length === 0) {
        await equipmentService.createEngine(user, boat, {
          kind: 'outboard',
          fuel: 'essence',
          brand: 'Mercury',
          model: '60 EFI',
          powerHp: 60,
          hours: Math.floor(Math.random() * 300) + 50,
          manufacturedAt: `${def.yearBuilt}-03-01`,
        })
      }
    }

    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')

    const events: Array<{
      title: string
      subject: 'boat' | 'engine' | 'sail' | 'rig'
      performedAt: string
      dueAt: string | null
    }> = [
      {
        title: 'Antifouling annuel',
        subject: 'boat',
        performedAt: today.minus({ days: 90 + Math.floor(Math.random() * 60) }).toISODate()!,
        dueAt: today.plus({ days: 30 + Math.floor(Math.random() * 60) }).toISODate()!,
      },
      {
        title: 'Révision moteur',
        subject: 'engine',
        performedAt: today.minus({ days: 30 + Math.floor(Math.random() * 30) }).toISODate()!,
        dueAt: today.minus({ days: Math.floor(Math.random() * 5) }).toISODate()!,
      },
      {
        title: 'Contrôle matériel de sécurité',
        subject: 'boat',
        performedAt: today.minus({ days: 15 }).toISODate()!,
        dueAt: null,
      },
      {
        title: 'Inspection du gréement',
        subject: def.propulsionType === 'sailboat' ? 'rig' : 'boat',
        performedAt: today.minus({ days: 180 }).toISODate()!,
        dueAt: today.plus({ days: 10 }).toISODate()!,
      },
      {
        title: "Resserrage de l'accastillage",
        subject: 'boat',
        performedAt: today.minus({ days: 45 }).toISODate()!,
        dueAt: today.plus({ days: 90 }).toISODate()!,
      },
    ]

    for (const e of events) {
      const existsEvent = await BoatMaintenanceEvent.query()
        .where('boatId', boat.id)
        .where('title', e.title)
        .first()

      if (!existsEvent) {
        if (e.subject === 'engine') {
          const engine = boat.engines[0]
          await maintenanceService.createForBoat(user, boat, {
            subject: 'engine',
            boatEngineId: engine?.id ?? null,
            engineCaption: engine ? null : 'Moteur',
            performedAt: e.performedAt,
            title: e.title,
          })
        } else if (e.subject === 'sail' && boat.sails[0]) {
          await maintenanceService.createForBoat(user, boat, {
            subject: 'sail',
            boatSailId: boat.sails[0].id,
            sailCaption: null,
            performedAt: e.performedAt,
            title: e.title,
          })
        } else if (e.subject === 'rig' && boat.rig) {
          await maintenanceService.createForBoat(user, boat, {
            subject: 'rig',
            boatRigId: boat.rig.id,
            performedAt: e.performedAt,
            title: e.title,
          })
        } else {
          await maintenanceService.createForBoat(user, boat, {
            subject: 'boat',
            performedAt: e.performedAt,
            title: e.title,
          })
        }
      }

      if (e.dueAt) {
        const existsTask = await BoatMaintenanceTask.query()
          .where('boatId', boat.id)
          .where('title', e.title)
          .where('status', 'open')
          .first()

        if (!existsTask) {
          const engineId = e.subject === 'engine' ? (boat.engines[0]?.id ?? null) : null
          const sailId = e.subject === 'sail' ? (boat.sails[0]?.id ?? null) : null
          const rigId = e.subject === 'rig' ? (boat.rig?.id ?? null) : null
          const subject = e.subject === 'rig' && !boat.rig ? 'boat' : e.subject

          await BoatMaintenanceTask.create({
            boatId: boat.id,
            subject,
            boatEngineId: engineId,
            boatSailId: sailId,
            boatRigId: rigId,
            title: e.title,
            notes: null,
            status: 'open',
            doneAt: null,
            dueAt: DateTime.fromISO(e.dueAt),
            recurrenceIntervalMonths: null,
            dueEngineHours: null,
            recurrenceIntervalEngineHours: null,
            lastDoneEngineHours: null,
            doneEngineHours: null,
          })
        }
      }
    }
  }
}

export default class SandboxSeeder extends BaseSeeder {
  constructor(client: QueryClientContract) {
    super(client)
  }

  async run() {
    await seedDemoData()
  }
}
