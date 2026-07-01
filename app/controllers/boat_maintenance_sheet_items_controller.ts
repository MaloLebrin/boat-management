import BoatMaintenanceSheetService, {
  BoatMaintenanceSheetItemNotFoundError,
  BoatMaintenanceSheetNotFoundError,
  BoatMaintenanceSheetValidationError,
} from '#services/boat_maintenance_sheet_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import MaintenancePolicy from '#policies/maintenance_policy'
import { updateSheetItemValidator } from '#validators/boat_maintenance_sheet'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatMaintenanceSheetItemsController {
  constructor(
    private boatService: BoatHullService,
    private sheetService: BoatMaintenanceSheetService
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

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateSheetItemValidator)

    try {
      await this.sheetService.updateItem(
        user,
        boat,
        Number(params.sheetId),
        Number(params.itemId),
        {
          isDone: payload.isDone,
          notes: payload.notes ?? null,
        }
      )
    } catch (error) {
      if (
        error instanceof BoatMaintenanceSheetNotFoundError ||
        error instanceof BoatMaintenanceSheetItemNotFoundError
      ) {
        session.flash('error', i18n.t('flash.maintenanceSheets.notFound'))
        response.redirect(`/boats/${boat.id}?tab=sheets`)
        return
      }
      if (error instanceof BoatMaintenanceSheetValidationError) {
        session.flash('error', i18n.t(`flash.maintenanceSheets.${error.errorCode}`))
        response.redirect(`/boats/${boat.id}?tab=sheets`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceSheets.itemUpdated'))
    response.redirect(`/boats/${boat.id}?tab=sheets`)
  }
}
