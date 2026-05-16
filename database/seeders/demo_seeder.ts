import { BaseSeeder } from '@adonisjs/lucid/seeders'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Boat from '#models/boat'
import BoatService from '#services/boat_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import UserService from '#services/user_service'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    /**
     * Run only this seeder:
     * `node ace db:seed --files database/seeders/demo_seeder.ts`
     *
     * This seeder is idempotent-ish:
     * - Reuses `ADMIN_EMAIL` user if it exists, otherwise creates it with an organization.
     * - Reuses the "Rhodes 21" boat for that organization if it exists.
     * - Creates equipment only if missing.
     * - Creates maintenance events only if missing (based on title uniqueness per boat).
     */

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminEmail || !adminPassword) {
      throw new Error('Missing ADMIN_EMAIL / ADMIN_PASSWORD in environment')
    }

    let user = await User.query().where('email', adminEmail).first()
    if (!user) {
      const userService = new UserService()
      ;({ user } = await userService.signupWithOrganization({
        email: adminEmail,
        password: adminPassword,
        fullName: 'Administrateur',
      }))
    }

    if (user.organizationId === null) {
      throw new Error('Admin user must belong to an organization')
    }

    const boatService = new BoatService()

    // Find or create boat
    const existingBoat = await Boat.query()
      .where('organizationId', user.organizationId)
      .where('name', 'Rhodes 21')
      .first()

    const boat =
      existingBoat ??
      (await boatService.createForUser(user, {
        name: 'Rhodes 21',
        propulsionType: 'sailboat',
        lengthM: 6.3,
        beamM: 2.48,
        draftM: 1.2,
        mastHeightM: 9.5,
        hullMaterial: 'fiberglass',
        yearBuilt: 1978,
        manufacturer: 'Rhodes',
        model: '21',
      }))

    // Ensure relations loaded
    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')

    // Equipment (create only if missing)
    if (boat.engines.length === 0) {
      await boatService.createEngine(user, boat, {
        kind: 'outboard',
        fuel: 'essence',
        brand: 'Yamaha',
        model: '8HP',
        powerHp: 8,
        hours: 120,
        manufacturedAt: '2018-04-01',
      })
    }

    if (boat.sails.length === 0) {
      await boatService.createSail(user, boat, {
        sailType: 'main',
        areaM2: 12.5,
        material: 'dacron',
        reefPoints: 2,
        manufacturedAt: '2020-05-01',
      })
      await boatService.createSail(user, boat, {
        sailType: 'genoa',
        areaM2: 15.0,
        material: 'dacron',
        reefPoints: 0,
        manufacturedAt: '2019-06-01',
      })
    }

    if (!boat.rig) {
      await boatService.upsertRig(user, boat, {
        rigType: 'sloop',
        mastCount: 1,
        spreaders: 2,
        manufacturedAt: '1978-01-01',
      })
    }

    // Maintenance events (skip if title already exists for this boat)
    const maintenanceService = new BoatMaintenanceService()
    const today = DateTime.now().startOf('day')
    const eventsToEnsure = [
      {
        title: 'Antifouling annuel',
        subject: 'boat' as const,
        performedAt: today.minus({ days: 120 }).toISODate()!,
        dueAt: today.plus({ days: 30 }).toISODate()!,
      },
      {
        title: 'Révision moteur',
        subject: 'engine' as const,
        performedAt: today.minus({ days: 20 }).toISODate()!,
        dueAt: today.minus({ days: 1 }).toISODate()!, // overdue
      },
      {
        title: 'Inspection du gréement',
        subject: 'rig' as const,
        performedAt: today.minus({ days: 200 }).toISODate()!,
        dueAt: today.plus({ days: 7 }).toISODate()!, // due soon
      },
      {
        title: 'Réparation couture grand-voile',
        subject: 'sail' as const,
        performedAt: today.minus({ days: 60 }).toISODate()!,
        dueAt: today.plus({ days: 60 }).toISODate()!,
      },
      {
        title: 'Contrôle matériel de sécurité',
        subject: 'boat' as const,
        performedAt: today.minus({ days: 10 }).toISODate()!,
        dueAt: null,
      },
      {
        title: "Resserrage de l'accastillage",
        subject: 'boat' as const,
        performedAt: today.minus({ days: 15 }).toISODate()!,
        dueAt: today.plus({ days: 90 }).toISODate()!,
      },
    ]

    // refresh relations for engine/sail/rig ids
    await boat.load('engines')
    await boat.load('sails')
    await boat.load('rig')

    for (const e of eventsToEnsure) {
      const exists = await BoatMaintenanceEvent.query()
        .where('boatId', boat.id)
        .where('title', e.title)
        .first()
      if (exists) continue

      // If legacy seed entry had a due date, it now becomes a planned task (not part of history)
      if (e.dueAt) {
        const engineId = e.subject === 'engine' ? (boat.engines[0]?.id ?? null) : null
        const sailId = e.subject === 'sail' ? (boat.sails[0]?.id ?? null) : null
        const rigId = e.subject === 'rig' ? (boat.rig?.id ?? null) : null

        const existingTask = await BoatMaintenanceTask.query()
          .where('boatId', boat.id)
          .where('title', e.title)
          .where('status', 'open')
          .where('dueAt', e.dueAt)
          .first()

        if (!existingTask) {
          await BoatMaintenanceTask.create({
            boatId: boat.id,
            subject: e.subject,
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

      if (e.subject === 'engine') {
        const engine = boat.engines[0]
        await maintenanceService.createForBoat(user, boat, {
          subject: 'engine',
          boatEngineId: engine?.id ?? null,
          engineCaption: engine ? null : 'Hors-bord',
          performedAt: e.performedAt,
          title: e.title,
        })
        continue
      }

      if (e.subject === 'sail') {
        const sail = boat.sails[0]
        await maintenanceService.createForBoat(user, boat, {
          subject: 'sail',
          boatSailId: sail?.id ?? null,
          sailCaption: sail ? null : 'Grand-voile',
          performedAt: e.performedAt,
          title: e.title,
        })
        continue
      }

      if (e.subject === 'rig') {
        if (!boat.rig) continue
        await maintenanceService.createForBoat(user, boat, {
          subject: 'rig',
          boatRigId: boat.rig.id,
          performedAt: e.performedAt,
          title: e.title,
        })
        continue
      }

      await maintenanceService.createForBoat(user, boat, {
        subject: 'boat',
        performedAt: e.performedAt,
        title: e.title,
      })
    }
  }
}
