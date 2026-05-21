import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import Port from '#models/port'
import Spot from '#models/spot'
import AiAnalysisService, { type AiSuggestion } from '#services/ai_analysis_service'
import BoatListService from '#services/boat_list_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MediaService from '#services/media_service'
import { createBoatValidator, updateBoatValidator } from '#validators/boat'
import { assignBoatValidator } from '#validators/marina_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatsController {
  constructor(
    private boatService: BoatService,
    private maintenanceService: BoatMaintenanceService,
    private taskService: BoatMaintenanceTaskService,
    private sheetService: BoatMaintenanceSheetService,
    private mediaService: MediaService,
    private aiAnalysisService: AiAnalysisService,
    private boatListService: BoatListService
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const { boats, filters } = await this.boatListService.listForUser(user, request.qs())

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
          .preload('pontoons', (q) =>
            q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
          )
          .preload('mouillages', (q) =>
            q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
          )
          .orderBy('name', 'asc')
        : []

    return inertia.render('boats/new', {
      ports: ports.map((p) => ({
        id: p.id,
        name: p.name,
        pontoons: p.pontoons.map((pt) => ({
          id: pt.id,
          name: pt.name,
          spots: pt.spots.map((s) => ({ id: s.id, name: s.name })),
        })),
        mouillages: p.mouillages.map((m) => ({
          id: m.id,
          name: m.name,
          spots: m.spots.map((s) => ({ id: s.id, name: s.name })),
        })),
      })),
    })
  }

  async store({ request, response, auth, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await bouncer.authorize('boatCreate')

    const payload = await request.validateUsing(createBoatValidator)

    const boat = await this.boatService.createForUser(user, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async show({ inertia, params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    try {
      const boat = await this.boatService.getFullDetailForUser(user, Number(params.id))
      await bouncer.authorize('boatView', boat)

      const [
        maintenanceEvents,
        maintenanceTasks,
        maintenanceSheets,
        boatMedia,
        positionHistory,
        latestSuggestions,
        canManageMaintenance,
      ] = await Promise.all([
        this.maintenanceService.listForBoat(user, boat),
        this.taskService.listForBoat(user, boat),
        this.sheetService.listForBoat(user, boat),
        this.mediaService.listForEntity('boat', boat.id),
        BoatPositionHistory.query()
          .where('boatId', boat.id)
          .preload('spot', (q) =>
            q
              .preload('pontoon', (pq) => pq.preload('port'))
              .preload('mouillage', (mq) => mq.preload('port'))
          )
          .orderBy('startedAt', 'desc')
          .limit(20),
        this.aiAnalysisService.getLatestBoatSuggestions(user.id, boat.id),
        bouncer.allows('boatUpdate', boat),
      ])

      const canManageEquipment = canManageMaintenance
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
          spotId: boat.spotId ?? null,
          spot: boat.spot
            ? {
              id: boat.spot.id,
              name: boat.spot.name,
              pontoonId: boat.spot.pontoonId,
              pontoonName: boat.spot.pontoon?.name ?? null,
              mouillageId: boat.spot.mouillageId,
              mouillageNom: boat.spot.mouillage?.name ?? null,
              portName: boat.spot.pontoon?.port?.name ?? boat.spot.mouillage?.port?.name ?? null,
            }
            : null,
          positionHistory: positionHistory.map((h) => ({
            id: h.id,
            spotId: h.spotId,
            spotName: h.spot?.name ?? null,
            pontoonName: h.spot?.pontoon?.name ?? null,
            mouillageNom: h.spot?.mouillage?.name ?? null,
            portName: h.spot?.pontoon?.port?.name ?? h.spot?.mouillage?.port?.name ?? null,
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

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
      await bouncer.authorize('boatUpdate', boat)

      const ports =
        user.organizationId !== null
          ? await Port.query()
            .where('organizationId', user.organizationId)
            .preload('pontoons', (q) =>
              q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
            )
            .preload('mouillages', (q) =>
              q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
            )
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
          spotId: boat.spotId ?? null,
        },
        ports: ports.map((p) => ({
          id: p.id,
          name: p.name,
          pontoons: p.pontoons.map((pt) => ({
            id: pt.id,
            name: pt.name,
            spots: pt.spots.map((s) => ({ id: s.id, name: s.name })),
          })),
          mouillages: p.mouillages.map((m) => ({
            id: m.id,
            name: m.name,
            spots: m.spots.map((s) => ({ id: s.id, name: s.name })),
          })),
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

    const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(updateBoatValidator)
    await this.boatService.updateForUser(user, boat, payload)

    response.redirect(`/boats/${boat.id}`)
  }

  async destroy({ params, auth, response, bouncer }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.authorize('boatDelete', boat)

    await this.boatService.deleteForUser(user, boat)
    response.redirect('/boats')
  }

  async assign({ request, params, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    if (user.organizationId === null) return response.redirect('/boats')

    const boat = await Boat.query()
      .where('id', Number(params.id))
      .where('organizationId', user.organizationId)
      .first()

    if (!boat) return response.redirect('/boats')

    const payload = await request.validateUsing(assignBoatValidator)

    if (payload.spotId !== null) {
      const spot = await Spot.query()
        .where('id', payload.spotId)
        .where('organizationId', user.organizationId)
        .first()
      if (!spot) return response.redirect().back()
    }

    await this.boatService.updateAssignment(boat, { spotId: payload.spotId })

    return response.redirect().back()
  }
}
