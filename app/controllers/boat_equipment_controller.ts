import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatService, { BoatEquipmentNotFoundError, BoatNotFoundError } from '#services/boat_service'
import MediaService from '#services/media_service'
import {
  type BoatEngineFormBody,
  type BoatRigFormBody,
  type BoatSailFormBody,
  equipmentBodyToEnginePayload,
  equipmentBodyToRigPayload,
  equipmentBodyToSailPayload,
  storeBoatEngineValidator,
  storeBoatSailValidator,
  updateBoatEngineValidator,
  updateBoatSailValidator,
  updateEquipmentNotesValidator,
  updateEquipmentStatusValidator,
  upsertBoatRigValidator,
} from '#validators/boat_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatEquipmentController {
  constructor(
    private boatService: BoatService,
    private maintenanceService: BoatMaintenanceService,
    private taskService: BoatMaintenanceTaskService,
    private mediaService: MediaService
  ) {}

  private async loadBoatForEquipment(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async storeEngine({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatEngineValidator)) as BoatEngineFormBody
    await this.boatService.createEngine(loaded.user, boat, equipmentBodyToEnginePayload(body))

    session.flash('success', i18n.t('flash.engine.added'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editEngine({ inertia, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const engine = boat.engines.find((e) => e.id === Number(params.engineId))
    if (!engine) {
      session.flash('error', i18n.t('flash.engine.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    return inertia.render('boats/engine_edit', {
      boat: { id: boat.id, name: boat.name },
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        strokeType: engine.strokeType,
        brand: engine.brand,
        model: engine.model,
        serialNumber: engine.serialNumber,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        powerHp: engine.powerHp,
        hours: engine.hours,
        installHours: engine.installHours,
        status: engine.status,
      },
    })
  }

  async updateEngine({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(updateBoatEngineValidator)) as BoatEngineFormBody

    try {
      await this.boatService.updateEngine(
        loaded.user,
        boat,
        Number(params.engineId),
        equipmentBodyToEnginePayload(body)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.engine.updated'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyEngine({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await this.boatService.deleteEngine(loaded.user, boat, Number(params.engineId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.engine.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async storeSail({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatSailValidator)) as BoatSailFormBody
    await this.boatService.createSail(loaded.user, boat, equipmentBodyToSailPayload(body))

    session.flash('success', i18n.t('flash.sail.added'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editSail({ inertia, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const sail = boat.sails.find((s) => s.id === Number(params.sailId))
    if (!sail) {
      session.flash('error', i18n.t('flash.sail.notFound'))
      response.redirect(`/boats/${boat.id}`)
      return
    }

    return inertia.render('boats/sail_edit', {
      boat: { id: boat.id, name: boat.name },
      sail: {
        id: sail.id,
        sailType: sail.sailType,
        manufacturedAt: sail.manufacturedAt ? sail.manufacturedAt.toISODate() : null,
        areaM2: sail.areaM2,
        material: sail.material,
        reefPoints: sail.reefPoints,
        status: sail.status,
        notes: sail.notes,
      },
    })
  }

  async updateSail({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(updateBoatSailValidator)) as BoatSailFormBody

    try {
      await this.boatService.updateSail(
        loaded.user,
        boat,
        Number(params.sailId),
        equipmentBodyToSailPayload(body)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.sail.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.sail.updated'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroySail({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await this.boatService.deleteSail(loaded.user, boat, Number(params.sailId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.sail.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.sail.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async editRig({ inertia, response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    return inertia.render('boats/rig_edit', {
      boat: { id: boat.id, name: boat.name },
      rig: boat.rig
        ? {
            id: boat.rig.id,
            rigType: boat.rig.rigType,
            manufacturedAt: boat.rig.manufacturedAt ? boat.rig.manufacturedAt.toISODate() : null,
            mastCount: boat.rig.mastCount,
            spreaders: boat.rig.spreaders,
            status: boat.rig.status,
            notes: boat.rig.notes,
          }
        : null,
    })
  }

  async upsertRig({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(upsertBoatRigValidator)) as BoatRigFormBody
    await this.boatService.upsertRig(loaded.user, boat, equipmentBodyToRigPayload(body))

    session.flash('success', i18n.t('flash.rig.saved'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyRig({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    await this.boatService.deleteRig(loaded.user, boat)

    session.flash('success', i18n.t('flash.rig.removed'))
    response.redirect(`/boats/${boat.id}`)
  }

  async showEngine({ inertia, response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)

    if (!engine) {
      return response.redirect(`/boats/${boat.id}`)
    }

    const canManage = await bouncer.allows('boatUpdate', boat)

    const [maintenanceEvents, maintenanceTasks, engineDocuments, engineParts] = await Promise.all([
      this.maintenanceService.listEventsForEngine(boat.id, engineId),
      this.taskService.listForEngine(boat.id, engineId),
      this.mediaService.listForEntity('boat_engine', engineId),
      (async () => {
        const BoatEnginePart = (await import('#models/boat_engine_part')).default
        return await BoatEnginePart.query().where('boatEngineId', engineId).orderBy('id', 'asc')
      })(),
    ])

    return inertia.render('boats/engine_show', {
      boat: { id: boat.id, name: boat.name },
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        strokeType: engine.strokeType,
        brand: engine.brand,
        model: engine.model,
        serialNumber: engine.serialNumber,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        powerHp: engine.powerHp,
        hours: engine.hours,
        installHours: engine.installHours,
        status: engine.status,
        notes: engine.notes,
        documents: engineDocuments.map((m) => ({
          id: m.id,
          kind: m.kind,
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
        parts: engineParts.map((p) => ({
          id: p.id,
          designation: p.designation,
          reference: p.reference,
          stock: p.stock,
          supplier: p.supplier,
          notes: p.notes,
        })),
      },
      maintenanceEvents: maintenanceEvents.map((ev) => ({
        id: ev.id,
        subject: ev.subject,
        title: ev.title,
        notes: ev.notes,
        performedAt: ev.performedAt.toISODate()!,
        engineCaption: ev.engineCaption,
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
        recurrenceIntervalEngineHours: t.recurrenceIntervalEngineHours,
      })),
      canManage,
    })
  }

  async updateEngineStatus({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const { status } = await request.validateUsing(updateEquipmentStatusValidator)

    try {
      await this.boatService.updateEngineStatus(loaded.user, boat, Number(params.engineId), status)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    response.redirect().back()
  }

  async updateEngineNotes({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const { notes } = await request.validateUsing(updateEquipmentNotesValidator)

    try {
      await this.boatService.updateEngineNotes(
        loaded.user,
        boat,
        Number(params.engineId),
        notes ?? null
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    response.redirect().back()
  }
}
