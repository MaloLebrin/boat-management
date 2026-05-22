import BoatMaintenanceSheetService, {
  BoatMaintenanceSheetNotFoundError,
} from '#services/boat_maintenance_sheet_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MaintenancePolicy from '#policies/maintenance_policy'
import { createBoatMaintenanceSheetValidator } from '#validators/boat_maintenance_sheet'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { SheetType } from '#shared/types/maintenance'

@inject()
export default class BoatMaintenanceSheetsController {
  constructor(
    private boatService: BoatService,
    private boatMaintenanceSheetService: BoatMaintenanceSheetService
  ) {}

  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
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

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('create', boat)

    const payload = await request.validateUsing(createBoatMaintenanceSheetValidator)

    await this.boatMaintenanceSheetService.createForBoat(user, boat, {
      type: payload.type as SheetType,
      title: payload.title,
      performedAt: payload.performedAt,
      notes: payload.notes ?? null,
    })

    session.flash('success', i18n.t('flash.maintenanceSheets.created'))
    response.redirect(`/boats/${boat.id}?tab=sheets`)
  }

  async complete({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    try {
      await this.boatMaintenanceSheetService.completeSheet(user, boat, Number(params.sheetId))
    } catch (error) {
      if (error instanceof BoatMaintenanceSheetNotFoundError) {
        session.flash('error', i18n.t('flash.maintenanceSheets.notFound'))
        response.redirect(`/boats/${boat.id}?tab=sheets`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceSheets.completed'))
    response.redirect(`/boats/${boat.id}?tab=sheets`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('delete', boat)

    try {
      await this.boatMaintenanceSheetService.deleteSheet(user, boat, Number(params.sheetId))
    } catch (error) {
      if (error instanceof BoatMaintenanceSheetNotFoundError) {
        session.flash('error', i18n.t('flash.maintenanceSheets.notFound'))
        response.redirect(`/boats/${boat.id}?tab=sheets`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceSheets.removed'))
    response.redirect(`/boats/${boat.id}?tab=sheets`)
  }
}
