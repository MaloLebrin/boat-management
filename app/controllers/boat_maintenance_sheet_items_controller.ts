import BoatMaintenanceSheetService, {
  BoatMaintenanceSheetNotFoundError,
  BoatMaintenanceSheetItemNotFoundError,
} from '#services/boat_maintenance_sheet_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import { updateSheetItemValidator } from '#validators/boat_maintenance_sheet'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatMaintenanceSheetItemsController {
  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(ctx.params.boatId))
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

    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(updateSheetItemValidator)
    const sheetService = new BoatMaintenanceSheetService()

    try {
      await sheetService.updateItem(user, boat, Number(params.sheetId), Number(params.itemId), {
        isDone: payload.isDone,
        notes: payload.notes ?? null,
      })
    } catch (error) {
      if (
        error instanceof BoatMaintenanceSheetNotFoundError ||
        error instanceof BoatMaintenanceSheetItemNotFoundError
      ) {
        session.flash('error', i18n.t('flash.maintenanceSheets.notFound'))
        response.redirect(`/boats/${boat.id}?tab=sheets`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.maintenanceSheets.itemUpdated'))
    response.redirect(`/boats/${boat.id}?tab=sheets`)
  }
}
