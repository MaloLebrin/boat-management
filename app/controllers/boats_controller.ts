import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatListService from '#services/boat_list_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MediaService from '#services/media_service'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import { assignBoatValidator } from '#validators/marina_layout'
import type { HttpContext } from '@adonisjs/core/http'
import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import Port from '#models/port'

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
    const user = auth.getUserOrFail()
    await bouncer.authorize('boatCreate')

    const ports =
      user.organizationId !== null
        ? await Port.query()
            .where('organizationId', user.organizationId)
            .preload('pontoons', (q) => q.orderBy('name', 'asc'))
            .preload('mouillages', (q) => q.orderBy('name', 'asc'))
            .orderBy('name', 'asc')
        : []

    return inertia.render('boats/new', {
      ports: ports.map((p) => ({
        id: p.id,
        name: p.name,
        pontoons: p.pontoons.map((pt) => ({ id: pt.id, name: pt.name })),
        mouillages: p.mouillages.map((m) => ({ id: m.id, name: m.name })),
      })),
    })
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

      if (boat.pontoonId !== null) {
        await boat.load('pontoon', (q) => q.preload('port'))
      }
      if (boat.mouillageId !== null) {
        await boat.load('mouillage', (q) => q.preload('port'))
      }

      const positionHistory = await BoatPositionHistory.query()
        .where('boatId', boat.id)
        .preload('pontoon', (q) => q.preload('port'))
        .preload('mouillage', (q) => q.preload('port'))
        .orderBy('startedAt', 'desc')
        .limit(20)

      const aiAnalysisService = new AiAnalysisService()
      const latestSuggestions = await aiAnalysisService.getLatestBoatSuggestions(user.id, boat.id)
      const aiSuggestions: AiSuggestion[] | null = latestSuggestions
        ? (JSON.parse(latestSuggestions.responseText) as AiSuggestion[])
        : null
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
          pontoonId: boat.pontoonId ?? null,
          mouillageId: boat.mouillageId ?? null,
          spotIdentifier: boat.spotIdentifier ?? null,
          pontoon: boat.pontoon
            ? {
                id: boat.pontoon.id,
                name: boat.pontoon.name,
                portId: boat.pontoon.portId,
                portName: boat.pontoon.port.name,
              }
            : null,
          mouillage: boat.mouillage
            ? {
                id: boat.mouillage.id,
                name: boat.mouillage.name,
                portId: boat.mouillage.portId,
                portName: boat.mouillage.port.name,
              }
            : null,
          positionHistory: positionHistory.map((h) => ({
            id: h.id,
            pontoonId: h.pontoonId,
            pontoonName: h.pontoon?.name ?? null,
            mouillageId: h.mouillageId,
            mouillageNom: h.mouillage?.name ?? null,
            portName: h.pontoon?.port?.name ?? h.mouillage?.port?.name ?? null,
            spotIdentifier: h.spotIdentifier,
            startedAt: h.startedAt.toISODate()!,
            endedAt: h.endedAt ? h.endedAt.toISODate() : null,
          })),
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
        aiSuggestions,
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

      const ports =
        user.organizationId !== null
          ? await Port.query()
              .where('organizationId', user.organizationId)
              .preload('pontoons', (q) => q.orderBy('name', 'asc'))
              .preload('mouillages', (q) => q.orderBy('name', 'asc'))
              .orderBy('name', 'asc')
          : []

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
          pontoonId: boat.pontoonId ?? null,
          mouillageId: boat.mouillageId ?? null,
          spotIdentifier: boat.spotIdentifier ?? null,
        },
        ports: ports.map((p) => ({
          id: p.id,
          name: p.name,
          pontoons: p.pontoons.map((pt) => ({ id: pt.id, name: pt.name })),
          mouillages: p.mouillages.map((m) => ({ id: m.id, name: m.name })),
        })),
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

  async assign({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.status(403).json({ error: 'forbidden' })

    const boat = await Boat.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!boat) return response.status(404).json({ error: 'not found' })

    const payload = await request.validateUsing(assignBoatValidator)

    const orgId = user.organizationId

    if (payload.pontoonId !== undefined && payload.pontoonId !== null) {
      const pontoon = await Pontoon.query()
        .whereHas('port', (q) => q.where('organizationId', orgId))
        .where('id', payload.pontoonId)
        .first()
      if (!pontoon) return response.status(404).json({ error: 'pontoon not found' })
    }

    if (payload.mouillageId !== undefined && payload.mouillageId !== null) {
      const mouillage = await Mouillage.query()
        .whereHas('port', (q) => q.where('organizationId', orgId))
        .where('id', payload.mouillageId)
        .first()
      if (!mouillage) return response.status(404).json({ error: 'mouillage not found' })
    }

    const boatService = new BoatService()
    await boatService.updateAssignment(boat, payload)

    return response.json({ ok: true })
  }
}
