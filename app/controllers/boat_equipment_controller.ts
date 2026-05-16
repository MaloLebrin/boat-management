import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import Media from '#models/media'
import BoatService, { BoatEquipmentNotFoundError, BoatNotFoundError } from '#services/boat_service'
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
  updateEquipmentStatusValidator,
  upsertBoatRigValidator,
} from '#validators/boat_equipment'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatEquipmentController {
  private async loadBoatForEquipment(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat, boatService }
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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatEngineValidator)) as BoatEngineFormBody
    await boatService.createEngine(loaded.user, boat, equipmentBodyToEnginePayload(body))

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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(updateBoatEngineValidator)) as BoatEngineFormBody

    try {
      await boatService.updateEngine(
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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await boatService.deleteEngine(loaded.user, boat, Number(params.engineId))
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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatSailValidator)) as BoatSailFormBody
    await boatService.createSail(loaded.user, boat, equipmentBodyToSailPayload(body))

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
      },
    })
  }

  async updateSail({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(updateBoatSailValidator)) as BoatSailFormBody

    try {
      await boatService.updateSail(
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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await boatService.deleteSail(loaded.user, boat, Number(params.sailId))
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
          }
        : null,
    })
  }

  async upsertRig({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(upsertBoatRigValidator)) as BoatRigFormBody
    await boatService.upsertRig(loaded.user, boat, equipmentBodyToRigPayload(body))

    session.flash('success', i18n.t('flash.rig.saved'))
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyRig({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    await boatService.deleteRig(loaded.user, boat)

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

    const maintenanceEvents = await BoatMaintenanceEvent.query()
      .where('boatId', boat.id)
      .where('boatEngineId', engineId)
      .preload('parts')
      .orderBy('performedAt', 'desc')

    const maintenanceTasks = await BoatMaintenanceTask.query()
      .where('boatId', boat.id)
      .where('boatEngineId', engineId)
      .orderBy('status', 'asc')
      .orderBy('dueAt', 'asc')
      .orderBy('id', 'desc')

    const engineDocuments = await Media.query()
      .where('entityType', 'boat_engine')
      .where('entityId', engineId)
      .where('kind', 'document')
      .orderBy('position', 'asc')

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

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const { status } = await request.validateUsing(updateEquipmentStatusValidator)

    try {
      await boatService.updateEngineStatus(loaded.user, boat, Number(params.engineId), status)
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
