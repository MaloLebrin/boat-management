import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import InstrumentAlertRuleService from '#services/instrument_alert_rule_service'
import InstrumentSourcePolicy from '#policies/instrument_source_policy'
import {
  InstrumentAlertPathInvalidError,
  InstrumentAlertRuleDuplicateError,
  InstrumentAlertRuleLimitError,
  InstrumentAlertRuleNotFoundError,
} from '#exceptions/instrument_errors'
import { upsertInstrumentAlertRuleValidator } from '#validators/instrument_alert_rules'

const FLASH_BY_ERROR: Array<[new (...args: never[]) => Error, string]> = [
  [InstrumentAlertPathInvalidError, 'flash.instruments.rulePathInvalid'],
  [InstrumentAlertRuleDuplicateError, 'flash.instruments.ruleDuplicate'],
  [InstrumentAlertRuleLimitError, 'flash.instruments.ruleLimit'],
  [InstrumentAlertRuleNotFoundError, 'flash.instruments.ruleNotFound'],
]

/**
 * Règles de seuil d'un bateau (#993) — admin seulement (`instruments.manage`).
 * Les actions redirigent vers la fiche : l'éditeur vit dans l'onglet Instruments.
 */
@inject()
export default class InstrumentAlertRulesController {
  constructor(
    private boatContext: BoatContextService,
    private ruleService: InstrumentAlertRuleService,
    private auditLogService: AuditLogService
  ) {}

  async store(ctx: HttpContext) {
    return this.save(ctx, null)
  }

  async update(ctx: HttpContext) {
    return this.save(ctx, Number(ctx.params.ruleId))
  }

  async destroy(ctx: HttpContext) {
    const { auth, bouncer, response, session, i18n, params } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved
    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)

    try {
      await this.ruleService.destroy(boat, Number(params.ruleId))
    } catch (error) {
      return this.fail(ctx, error)
    }
    await this.audit(user.id, boat, 'boat.instrument_alert_rule_delete', {
      ruleId: Number(params.ruleId),
    })
    session.flash('success', i18n.t('flash.instruments.ruleDeleted'))
    return response.redirect().back()
  }

  private async save(ctx: HttpContext, ruleId: number | null) {
    const { auth, bouncer, request, response, session, i18n } = ctx
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat(ctx)
    if (!resolved) return
    const { user, boat } = resolved
    await bouncer.with(InstrumentSourcePolicy).authorize('manage', boat)
    const payload = await request.validateUsing(upsertInstrumentAlertRuleValidator)

    try {
      const rule = await this.ruleService.upsert(boat, payload, ruleId)
      await this.audit(user.id, boat, 'boat.instrument_alert_rule_update', {
        ruleId: rule.id,
        path: rule.path,
        operator: rule.operator,
        enabled: rule.enabled,
      })
      session.flash('success', i18n.t('flash.instruments.ruleSaved'))
      return response.redirect().back()
    } catch (error) {
      return this.fail(ctx, error)
    }
  }

  private fail({ response, session, i18n }: HttpContext, error: unknown) {
    const match = FLASH_BY_ERROR.find(([ErrorClass]) => error instanceof ErrorClass)
    if (!match) throw error
    session.flash('error', i18n.t(match[1]))
    return response.redirect().back()
  }

  private audit(
    userId: number,
    boat: { id: number; organizationId: number },
    action: 'boat.instrument_alert_rule_update' | 'boat.instrument_alert_rule_delete',
    metadata: Record<string, unknown>
  ) {
    return this.auditLogService.log({
      organizationId: boat.organizationId,
      userId,
      action,
      entityType: 'boat',
      entityId: boat.id,
      metadata,
    })
  }
}
