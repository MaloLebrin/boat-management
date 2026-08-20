import Boat from '#models/boat'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Mouillage from '#models/mouillage'
import Notification from '#models/notification'
import Organization from '#models/organization'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
import Spot from '#models/spot'
import User from '#models/user'
import type { NotificationSeverity, NotificationType } from '#shared/types/notification'
import BoatEquipmentService from '#services/boat_equipment_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatService from '#services/boat_hull_service'
import MouillageService from '#services/mouillage_service'
import PontoonService from '#services/pontoon_service'
import PortService from '#services/port_service'
import SpotService from '#services/spot_service'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234'

/**
 * Plan marina de la démo (#478) : le plan interactif est un argument produit,
 * et la sandbox l'affichait vide (« Aucun port enregistré »).
 *
 * Les coordonnées sont exprimées dans le repère du canvas SVG
 * (`MARINA_CANVAS_WIDTH` × `MARINA_CANVAS_HEIGHT`, soit 1400 × 900) : sans
 * position enregistrée, `MarinaMapTab` retombe sur une grille automatique qui
 * empile les pontons — on fige donc une disposition lisible dès le seed.
 *
 * Un ponton n'affiche que ses 6 premières places (`MAX_VISIBLE_SPOTS` dans
 * `MarinaPontoon.vue`), les suivantes étant résumées par un « +N » : les
 * pontons de démo s'arrêtent à 6 places pour rester entièrement visibles.
 */
const DEMO_PORT_NAME = 'Port de la Grande Rade'

const DEMO_PONTOONS: Array<{
  name: string
  description: string
  x: number
  y: number
  spots: string[]
}> = [
  {
    name: 'Ponton A',
    description: "Unités jusqu'à 8 m",
    x: 90,
    y: 90,
    spots: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'],
  },
  {
    name: 'Ponton B',
    description: '8 à 14 m, ponton visiteurs',
    x: 90,
    y: 320,
    spots: ['B01', 'B02', 'B03', 'B04', 'B05', 'B06'],
  },
  {
    name: 'Ponton C',
    description: 'Grandes unités et catamarans',
    x: 90,
    y: 550,
    spots: ['C01', 'C02', 'C03', 'C04'],
  },
]

const DEMO_MOUILLAGE = {
  name: 'Corps-morts du Sud',
  description: 'Zone de mouillage sur coffres, accès par annexe',
  x: 620,
  y: 240,
  spots: ['M1', 'M2', 'M3', 'M4'],
}

/** Bateau de démo → place occupée, pour que le plan montre du plein et du vide. */
const DEMO_BERTHS: Record<string, string> = {
  'Albatros': 'A03',
  'Cap Mistral': 'A05',
  'Marin du Vent': 'B02',
  'Étoile du Port': 'C01',
  'Tempête Douce': 'M2',
}

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
          installHours: Math.floor(Math.random() * 600) + 100,
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
          installHours: Math.floor(Math.random() * 300) + 50,
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

  await seedDemoPort(user, org)
  await seedDemoNotifications(user, org)
}

/**
 * Port de démonstration : sans lui, `/ports` affiche « Aucun port enregistré »
 * et le plan marina interactif — argument produit — reste invisible pour un
 * visiteur de la sandbox (#478).
 *
 * Idempotent : chaque étage (port → ponton/mouillage → place) est cherché par
 * nom avant création, et l'affectation d'un bateau est gardée par
 * `boat.spotId !== spot.id` — `BoatService.updateAssignment` journalise un
 * changement de poste dans `boat_position_history` à chaque appel, sans quoi
 * relancer le seed empilerait un historique de mouvements fictif.
 */
async function seedDemoPort(user: User, org: Organization) {
  const portService = await app.container.make(PortService)
  const pontoonService = await app.container.make(PontoonService)
  const mouillageService = await app.container.make(MouillageService)
  const spotService = await app.container.make(SpotService)
  const boatService = await app.container.make(BoatService)

  const port =
    (await Port.query().where('organizationId', org.id).where('name', DEMO_PORT_NAME).first()) ??
    (await portService.createForUser(user, {
      name: DEMO_PORT_NAME,
      city: 'Saint-Malo',
      country: 'France',
      address: 'Quai Duguay-Trouin, 35400 Saint-Malo',
      notes: 'Port de démonstration : 3 pontons, une zone de mouillage, 20 places.',
    }))

  /** Nom de place → place créée, pour l'affectation des bateaux plus bas. */
  const spotsByName = new Map<string, Spot>()

  for (const def of DEMO_PONTOONS) {
    let pontoon = await Pontoon.query().where('portId', port.id).where('name', def.name).first()

    if (!pontoon) {
      pontoon = await pontoonService.createForPort(port, {
        name: def.name,
        description: def.description,
      })
      // Position posée à la création seulement : la repositionner à chaque run
      // écraserait le déplacement fait par un visiteur entre deux resets.
      await pontoonService.updatePosition(pontoon, { x: def.x, y: def.y })
    }

    for (const spotName of def.spots) {
      const spot =
        (await Spot.query().where('pontoonId', pontoon.id).where('name', spotName).first()) ??
        (await spotService.createForPontoon(pontoon, port, { name: spotName }))
      spotsByName.set(spotName, spot)
    }
  }

  let mouillage = await Mouillage.query()
    .where('portId', port.id)
    .where('name', DEMO_MOUILLAGE.name)
    .first()

  if (!mouillage) {
    mouillage = await mouillageService.createForPort(port, {
      name: DEMO_MOUILLAGE.name,
      description: DEMO_MOUILLAGE.description,
    })
    await mouillageService.updatePosition(mouillage, { x: DEMO_MOUILLAGE.x, y: DEMO_MOUILLAGE.y })
  }

  for (const spotName of DEMO_MOUILLAGE.spots) {
    const spot =
      (await Spot.query().where('mouillageId', mouillage.id).where('name', spotName).first()) ??
      (await spotService.createForMouillage(mouillage, port, { name: spotName }))
    spotsByName.set(spotName, spot)
  }

  for (const [boatName, spotName] of Object.entries(DEMO_BERTHS)) {
    const spot = spotsByName.get(spotName)
    if (!spot) continue

    const boat = await Boat.query().where('organizationId', org.id).where('name', boatName).first()
    if (!boat || boat.spotId === spot.id) continue

    await boatService.updateAssignment(boat, { spotId: spot.id })
  }
}

/**
 * Notifications de démonstration pour le compte démo, afin que la cloche
 * affiche un badge de non-lus et un panneau peuplé. Mélange lu/non-lu et
 * sévérités variées, avec des `actionUrl` pointant vers de vraies pages.
 * Idempotent : garde par `userId` + `title` (pas de contrainte d'unicité en base).
 */
async function seedDemoNotifications(user: User, org: Organization) {
  const now = DateTime.now()

  const boats = await Boat.query().where('organizationId', org.id)
  const boatUrl = (name: string): string => {
    const boat = boats.find((b) => b.name === name)
    return boat ? `/boats/${boat.id}` : '/boats'
  }

  const defs: Array<{
    type: NotificationType
    severity: NotificationSeverity
    title: string
    body: string | null
    actionUrl: string | null
    read: boolean
    ageHours: number
    metadata?: Record<string, unknown> | null
  }> = [
    {
      type: 'maintenance.overdue',
      severity: 'error',
      title: 'Maintenance en retard sur Albatros',
      body: 'La révision moteur est en retard de plusieurs jours.',
      actionUrl: '/planning',
      read: false,
      ageHours: 2,
    },
    {
      type: 'document.expiring_soon',
      severity: 'warning',
      title: 'Assurance à renouveler sur Marin du Vent',
      body: "Le document d'assurance expire dans 12 jours.",
      actionUrl: boatUrl('Marin du Vent'),
      read: false,
      ageHours: 20,
    },
    {
      type: 'safety_equipment.expired',
      severity: 'error',
      title: 'Équipement de sécurité expiré sur Cap Mistral',
      body: 'Un extincteur a dépassé sa date de validité.',
      actionUrl: boatUrl('Cap Mistral'),
      read: false,
      ageHours: 30,
    },
    {
      type: 'member.joined',
      severity: 'info',
      title: "Camille Laurent a rejoint l'organisation",
      body: null,
      actionUrl: '/settings/members',
      read: true,
      ageHours: 52,
    },
    {
      type: 'plan.upgraded',
      severity: 'success',
      title: 'Plan mis à niveau vers Pro',
      body: 'Votre organisation est passée de Starter à Pro.',
      actionUrl: '/settings/billing',
      read: true,
      ageHours: 96,
    },
    {
      type: 'quota.storage',
      severity: 'warning',
      title: 'Stockage à 80 %',
      body: 'La Marina Démo a utilisé 80 % de son espace de stockage.',
      actionUrl: '/settings/billing',
      read: true,
      ageHours: 140,
    },
  ]

  for (const def of defs) {
    const exists = await Notification.query()
      .where('userId', user.id)
      .where('title', def.title)
      .first()
    if (exists) continue

    const createdAt = now.minus({ hours: def.ageHours })
    await Notification.create({
      userId: user.id,
      organizationId: org.id,
      type: def.type,
      severity: def.severity,
      title: def.title,
      body: def.body,
      actionUrl: def.actionUrl,
      metadata: def.metadata ?? null,
      readAt: def.read ? createdAt.plus({ minutes: 30 }) : null,
      createdAt,
    })
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
