import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatListService from '#services/boat_list_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MediaService from '#services/media_service'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatsController {
  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatListService = new BoatListService()
    const { boats, filters } = await boatListService.listForUser(user, request.qs())

    return inertia.render('boats/index', {
      boats,
      filters,
    })
  }

  async create({ inertia, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    await bouncer.authorize('boatCreate')

    return inertia.render('boats/new', {})
  }

  async store({ request, response, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.authorize('boatCreate')

    const payload = await request.validateUsing(createBoatValidator)

    const boatService = new BoatService()
    const boat = await boatService.createForUser(user, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async show({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.authorize('boatView', boat)
      const maintenanceService = new BoatMaintenanceService()
      const maintenanceEvents = await maintenanceService.listForBoat(user, boat)
      const taskService = new BoatMaintenanceTaskService()
      const maintenanceTasks = await taskService.listForBoat(user, boat)
      const sheetService = new BoatMaintenanceSheetService()
      const maintenanceSheets = await sheetService.listForBoat(user, boat)
      const canManageMaintenance = await bouncer.allows('boatUpdate', boat)
      const canManageEquipment = canManageMaintenance
      const mediaService = new MediaService()
      const boatMedia = await mediaService.listForEntity('boat', boat.id)
      await boat.load('safetyEquipment')
      return inertia.render('boats/show', {
        boat: {
          id: boat.id,
          name: boat.name,
          registrationNumber: boat.registrationNumber,
          type: boat.type,
          propulsionType: boat.propulsionType,
          lengthM: boat.lengthM,
          beamM: boat.beamM,
          draftM: boat.draftM,
          mastHeightM: boat.mastHeightM,
          hullMaterial: boat.hullMaterial,
          yearBuilt: boat.yearBuilt,
          manufacturer: boat.manufacturer,
          model: boat.model,
          homePort: boat.homePort,
          navigationCategory: boat.navigationCategory,
          hullIdentificationNumber: boat.hullIdentificationNumber,
          francisationNumber: boat.francisationNumber,
          flagCountry: boat.flagCountry,
          maxPersons: boat.maxPersons,
          engines: boat.engines.map((e) => ({
            id: e.id,
            kind: e.kind,
            fuel: e.fuel,
            brand: e.brand,
            model: e.model,
            serialNumber: e.serialNumber,
            manufacturedAt: e.manufacturedAt ? e.manufacturedAt.toISODate() : null,
            powerHp: e.powerHp,
            hours: e.hours,
            status: e.status,
          })),
          sails: boat.sails.map((s) => ({
            id: s.id,
            sailType: s.sailType,
            manufacturedAt: s.manufacturedAt ? s.manufacturedAt.toISODate() : null,
            areaM2: s.areaM2,
            material: s.material,
            reefPoints: s.reefPoints,
            status: s.status,
          })),
          rig: boat.rig
            ? {
                id: boat.rig.id,
                rigType: boat.rig.rigType,
                manufacturedAt: boat.rig.manufacturedAt
                  ? boat.rig.manufacturedAt.toISODate()
                  : null,
                mastCount: boat.rig.mastCount,
                spreaders: boat.rig.spreaders,
                status: boat.rig.status,
              }
            : null,
          media: boatMedia.map((m) => ({
            id: m.id,
            kind: m.kind as 'photo' | 'document',
            secureUrl: m.secureUrl,
            cloudinaryPublicId: m.cloudinaryPublicId,
            originalFilename: m.originalFilename,
            format: m.format,
            bytes: m.bytes,
            width: m.width,
            height: m.height,
            position: m.position,
            caption: m.caption,
          })),
          safetyEquipment: boat.safetyEquipment.map((item) => ({
            id: item.id,
            equipmentType: item.equipmentType,
            quantity: item.quantity,
            expiryDate: item.expiryDate ? item.expiryDate.toISODate() : null,
            status: item.status,
            notes: item.notes,
          })),
        },
        maintenanceEvents: maintenanceEvents.map((ev) => ({
          id: ev.id,
          subject: ev.subject,
          title: ev.title,
          notes: ev.notes,
          performedAt: ev.performedAt.toISODate()!,
          engineCaption: ev.engineCaption,
          sailCaption: ev.sailCaption,
          boatEngineId: ev.boatEngineId,
          boatSailId: ev.boatSailId,
          boatRigId: ev.boatRigId,
          parts: ev.parts.map((p) => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            notes: p.notes,
          })),
        })),
        maintenanceTasks: maintenanceTasks.map((t) => ({
          id: t.id,
          subject: t.subject,
          title: t.title,
          notes: t.notes,
          status: t.status as 'open' | 'done',
          dueAt: t.dueAt ? t.dueAt.toISODate() : null,
          dueEngineHours: t.dueEngineHours,
          boatEngineId: t.boatEngineId,
          boatSailId: t.boatSailId,
          boatRigId: t.boatRigId,
          recurrenceIntervalMonths: t.recurrenceIntervalMonths,
          recurrenceIntervalEngineHours: t.recurrenceIntervalEngineHours,
        })),
        maintenanceSheets: maintenanceSheets.map((s) => ({
          id: s.id,
          type: s.type as 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier',
          title: s.title,
          status: s.status as 'in_progress' | 'completed',
          performedAt: s.performedAt.toISODate()!,
          notes: s.notes,
          items: s.items.map((item) => ({
            id: item.id,
            label: item.label,
            isDone: item.isDone,
            notes: item.notes,
            position: item.position,
          })),
        })),
        canManageMaintenance,
        canManageEquipment,
      })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async edit({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.authorize('boatUpdate', boat)
      return inertia.render('boats/edit', {
        boat: {
          id: boat.id,
          name: boat.name,
          registrationNumber: boat.registrationNumber,
          type: boat.type,
          propulsionType: boat.propulsionType,
          lengthM: boat.lengthM,
          beamM: boat.beamM,
          draftM: boat.draftM,
          mastHeightM: boat.mastHeightM,
          hullMaterial: boat.hullMaterial,
          yearBuilt: boat.yearBuilt,
          manufacturer: boat.manufacturer,
          model: boat.model,
          manufacturedAt: boat.manufacturedAt ? boat.manufacturedAt.toISODate() : null,
          homePort: boat.homePort,
          navigationCategory: boat.navigationCategory,
          hullIdentificationNumber: boat.hullIdentificationNumber,
          francisationNumber: boat.francisationNumber,
          flagCountry: boat.flagCountry,
          maxPersons: boat.maxPersons,
        },
      })
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return
      }
      throw error
    }
  }

  async update({ request, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    const boat = await boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(updateBoatValidator)
    await boatService.updateForUser(user, boat, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async destroy({ params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatService = new BoatService()
    const boat = await boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatDelete', boat)

    await boatService.deleteForUser(user, boat)
    response.redirect('/boats')
  }
}
