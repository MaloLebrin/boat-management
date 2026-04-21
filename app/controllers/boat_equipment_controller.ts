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

  async storeEngine({ request, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatEngineValidator)) as BoatEngineFormBody
    await boatService.createEngine(loaded.user, boat, equipmentBodyToEnginePayload(body))

    session.flash('success', 'Engine added.')
    response.redirect(`/boats/${boat.id}`)
  }

  async editEngine({ inertia, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const engine = boat.engines.find((e) => e.id === Number(params.engineId))
    if (!engine) {
      session.flash('error', 'Engine not found.')
      response.redirect(`/boats/${boat.id}`)
      return
    }

    return inertia.render('boats/engine_edit', {
      boat: { id: boat.id, name: boat.name },
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        brand: engine.brand,
        model: engine.model,
        serialNumber: engine.serialNumber,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        powerHp: engine.powerHp,
        hours: engine.hours,
      },
    })
  }

  async updateEngine({ request, response, auth, params, bouncer, session }: HttpContext) {
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
        session.flash('error', 'Engine not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Engine updated.')
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyEngine({ response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await boatService.deleteEngine(loaded.user, boat, Number(params.engineId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', 'Engine not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Engine removed.')
    response.redirect(`/boats/${boat.id}`)
  }

  async storeSail({ request, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(storeBoatSailValidator)) as BoatSailFormBody
    await boatService.createSail(loaded.user, boat, equipmentBodyToSailPayload(body))

    session.flash('success', 'Sail added.')
    response.redirect(`/boats/${boat.id}`)
  }

  async editSail({ inertia, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const sail = boat.sails.find((s) => s.id === Number(params.sailId))
    if (!sail) {
      session.flash('error', 'Sail not found.')
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
      },
    })
  }

  async updateSail({ request, response, auth, params, bouncer, session }: HttpContext) {
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
        session.flash('error', 'Sail not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Sail updated.')
    response.redirect(`/boats/${boat.id}`)
  }

  async destroySail({ response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    try {
      await boatService.deleteSail(loaded.user, boat, Number(params.sailId))
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', 'Sail not found.')
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', 'Sail removed.')
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
          }
        : null,
    })
  }

  async upsertRig({ request, response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const body = (await request.validateUsing(upsertBoatRigValidator)) as BoatRigFormBody
    await boatService.upsertRig(loaded.user, boat, equipmentBodyToRigPayload(body))

    session.flash('success', 'Rig saved.')
    response.redirect(`/boats/${boat.id}`)
  }

  async destroyRig({ response, auth, params, bouncer, session }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoatForEquipment({ auth, response, params })
    if (!loaded) return

    const { boat, boatService } = loaded
    await bouncer.authorize('boatUpdate', boat)

    await boatService.deleteRig(loaded.user, boat)

    session.flash('success', 'Rig removed.')
    response.redirect(`/boats/${boat.id}`)
  }
}
