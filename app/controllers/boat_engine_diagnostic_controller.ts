import MaintenancePolicy from '#policies/maintenance_policy'
import BoatEngineDiagnosticService, {
  BoatEquipmentNotFoundError,
  DiagnosticStepNotFoundError,
  EngineNotDiagnosticEligibleError,
} from '#services/boat_engine_diagnostic_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import { DIAGNOSTIC_SHEET_SLUGS, type DiagnosticSheetSlug } from '#shared/types/diagnostic'
import {
  resetDiagnosticValidator,
  toggleDiagnosticStepValidator,
} from '#validators/boat_engine_diagnostic'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatEngineDiagnosticController {
  constructor(
    private boatService: BoatHullService,
    private diagnosticService: BoatEngineDiagnosticService
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

  async index({ inertia, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const canView = user.organizationId
      ? await user.hasPermission(user.organizationId, 'maintenance.view')
      : false
    if (!canView) return response.redirect('/dashboard')

    const engines = await this.diagnosticService.listEligibleEnginesForUser(user)

    return inertia.render('diagnostic/index', { engines })
  }

  async firstContact({ inertia, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const canView = user.organizationId
      ? await user.hasPermission(user.organizationId, 'maintenance.view')
      : false
    if (!canView) return response.redirect('/dashboard')

    return inertia.render('diagnostic/first_contact', {})
  }

  async checklist(ctx: HttpContext) {
    const { inertia, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    try {
      const engine = await this.diagnosticService.getEligibleEngineOrFail(user, boat, engineId)
      const checkedStepKeys = await this.diagnosticService.getCheckedStepKeys(user, boat, engineId)
      const canManage = await bouncer.with(MaintenancePolicy).allows('edit', boat)

      return inertia.render('diagnostic/checklist', {
        boat: { id: boat.id, name: boat.name },
        engine: {
          id: engine.id,
          brand: engine.brand,
          model: engine.model,
          kind: engine.kind,
          status: engine.status,
        },
        checkedStepKeys,
        canManage,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotDiagnosticEligibleError) {
        session.flash('error', i18n.t('flash.diagnostic.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }

  async sheet(ctx: HttpContext) {
    const { inertia, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    const sheetSlug = String(params.sheetSlug)

    // La fiche « premier contact » (achat d'occasion) n'est liée à aucun
    // moteur : elle vit sur sa page autonome.
    if (sheetSlug === 'first-contact') return response.redirect('/diagnostic/first-contact')

    if (!DIAGNOSTIC_SHEET_SLUGS.includes(sheetSlug as DiagnosticSheetSlug)) {
      session.flash('error', i18n.t('flash.diagnostic.sheetNotFound'))
      return response.redirect(`/boats/${boat.id}/engines/${engineId}/diagnostic`)
    }

    try {
      const engine = await this.diagnosticService.getEligibleEngineOrFail(user, boat, engineId)
      const checkedStepKeys = await this.diagnosticService.getCheckedStepKeys(user, boat, engineId)
      const canManage = await bouncer.with(MaintenancePolicy).allows('edit', boat)

      return inertia.render('diagnostic/sheet', {
        boat: { id: boat.id, name: boat.name },
        engine: {
          id: engine.id,
          brand: engine.brand,
          model: engine.model,
          kind: engine.kind,
          status: engine.status,
        },
        sheetSlug: sheetSlug as DiagnosticSheetSlug,
        checkedStepKeys,
        canManage,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotDiagnosticEligibleError) {
        session.flash('error', i18n.t('flash.diagnostic.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }

  async toggleStep(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(toggleDiagnosticStepValidator)

    try {
      await this.diagnosticService.toggleStep(
        user,
        boat,
        Number(params.engineId),
        payload.stepKey,
        payload.checked
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotDiagnosticEligibleError) {
        session.flash('error', i18n.t('flash.diagnostic.notEligible'))
        return response.redirect().back()
      }
      if (error instanceof DiagnosticStepNotFoundError) {
        session.flash('error', i18n.t('flash.diagnostic.stepNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async reset(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(resetDiagnosticValidator)

    try {
      await this.diagnosticService.resetChecks(
        user,
        boat,
        Number(params.engineId),
        payload.scope ?? 'all'
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotDiagnosticEligibleError) {
        session.flash('error', i18n.t('flash.diagnostic.notEligible'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.diagnostic.resetDone'))
    return response.redirect().back()
  }
}
