import BoatMaintenanceSheetService from '#services/boat_maintenance_sheet_service'
import {
  BoatMaintenanceSheetItemConflictError,
  BoatMaintenanceSheetItemNotFoundError,
  BoatMaintenanceSheetNotFoundError,
  BoatMaintenanceSheetValidationError,
} from '#exceptions/maintenance_errors'
import MaintenancePolicy from '#policies/maintenance_policy'
import { updateSheetItemValidator } from '#validators/boat_maintenance_sheet'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import { UPDATE_SHEET_ITEM_ACTION } from '#shared/constants/offline_queue'

@inject()
export default class BoatMaintenanceSheetItemsController {
  constructor(
    private boatContext: BoatContextService,
    private sheetService: BoatMaintenanceSheetService
  ) {}

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    // Détection de conflit au rejeu hors-ligne (#490) — hors validateur, comme
    // pour les journaux de navigation
    const expectedUpdatedAt = request.input('_expectedUpdatedAt') as string | undefined
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
          expectedUpdatedAt,
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
      if (error instanceof BoatMaintenanceSheetItemConflictError) {
        session.flash('conflictData', JSON.stringify(error.currentItem))
        session.flash('conflictType', UPDATE_SHEET_ITEM_ACTION)
        response.redirect().back()
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
