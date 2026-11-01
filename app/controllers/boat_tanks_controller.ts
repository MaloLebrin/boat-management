import {
  BoatTankInstrumentKeyTakenError,
  BoatEquipmentNotFoundError,
} from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type User from '#models/user'
import BoatPolicy from '#policies/boat_policy'
import BoatTankService from '#services/boat_tank_service'
import BoatContextService from '#services/boat_context_service'
import {
  tankInstrumentKeyValidator,
  boatTankValidator,
} from '#validators/boat_instrument_equipment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Réservoirs d'un bateau (#1037) — écrans Inertia : toutes les actions
 * redirigent (jamais de JSON), le formulaire vit dans l'onglet Équipements.
 */
@inject()
export default class BoatTanksController {
  constructor(
    private boatContext: BoatContextService,
    private tankService: BoatTankService
  ) {}

  async store(ctx: HttpContext) {
    return this.run(ctx, 'added', async (user, boat) => {
      const payload = await ctx.request.validateUsing(boatTankValidator)
      await this.tankService.create(user, boat, payload)
    })
  }

  async update(ctx: HttpContext) {
    return this.run(ctx, 'updated', async (user, boat) => {
      const payload = await ctx.request.validateUsing(boatTankValidator)
      await this.tankService.update(user, boat, Number(ctx.params.tankId), payload)
    })
  }

  async updateInstrumentKey(ctx: HttpContext) {
    return this.run(ctx, 'instrumentKeySaved', async (user, boat) => {
      const { instrumentKey } = await ctx.request.validateUsing(tankInstrumentKeyValidator)
      await this.tankService.setInstrumentKey(
        user,
        boat,
        Number(ctx.params.tankId),
        instrumentKey ?? null
      )
    })
  }

  async destroy(ctx: HttpContext) {
    return this.run(ctx, 'removed', async (user, boat) => {
      await this.tankService.delete(user, boat, Number(ctx.params.tankId))
    })
  }

  private async run(
    ctx: HttpContext,
    successKey: string,
    action: (user: User, boat: Boat) => Promise<void>
  ) {
    const { auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    await bouncer.with(BoatPolicy).authorize('edit', loaded.boat)

    try {
      await action(loaded.user, loaded.boat)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.tank.notFound'))
        return response.redirect(`/boats/${loaded.boat.id}`)
      }
      if (error instanceof BoatTankInstrumentKeyTakenError) {
        session.flash('error', i18n.t('flash.tank.instrumentKeyTaken'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t(`flash.tank.${successKey}`))
    return response.redirect().back()
  }
}
