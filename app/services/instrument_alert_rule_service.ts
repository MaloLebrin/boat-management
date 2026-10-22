import type Boat from '#models/boat'
import BoatInstrumentAlert from '#models/boat_instrument_alert'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import {
  InstrumentAlertPathInvalidError,
  InstrumentAlertRuleDuplicateError,
  InstrumentAlertRuleLimitError,
  InstrumentAlertRuleNotFoundError,
} from '#exceptions/instrument_errors'
import { INSTRUMENT_ALERT_MAX_RULES_PER_BOAT } from '#shared/constants/instrument_alerts'
import { telemetryPathSpec } from '#shared/constants/instruments'
import { displayToSi, hysteresisToSi } from '#shared/helpers/instrument_alerts'
import type {
  InstrumentAlertRuleRow,
  UpsertInstrumentAlertRulePayload,
} from '#shared/types/instruments'
import { toAlertRuleRow } from '#transformers/instrument_transformer'
import { DateTime } from 'luxon'

/**
 * Règles de seuil d'un bateau (#993). Le formulaire saisit seuil et marge
 * dans l'unité d'affichage du chemin ; la base les garde en SI (D8).
 */
export default class InstrumentAlertRuleService {
  async listForBoat(boat: Pick<Boat, 'id'>): Promise<InstrumentAlertRuleRow[]> {
    const rules = await BoatInstrumentAlertRule.query()
      .where('boatId', boat.id)
      .orderBy('path', 'asc')
      .orderBy('id', 'asc')
    return rules.map(toAlertRuleRow)
  }

  async upsert(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    payload: UpsertInstrumentAlertRulePayload,
    ruleId: number | null = null
  ): Promise<BoatInstrumentAlertRule> {
    const spec = telemetryPathSpec(payload.path)
    if (!spec || spec.valueKind !== 'number')
      throw new InstrumentAlertPathInvalidError(payload.path)

    const existing = ruleId === null ? null : await this.findForBoat(boat, ruleId)
    const duplicate = await BoatInstrumentAlertRule.query()
      .where('boatId', boat.id)
      .where('path', payload.path)
      .where('operator', payload.operator)
      .if(existing, (query) => query.whereNot('id', existing!.id))
      .first()
    if (duplicate) throw new InstrumentAlertRuleDuplicateError()

    if (!existing) {
      const count = await BoatInstrumentAlertRule.query()
        .where('boatId', boat.id)
        .count('* as total')
      if (Number(count[0].$extras.total) >= INSTRUMENT_ALERT_MAX_RULES_PER_BOAT) {
        throw new InstrumentAlertRuleLimitError()
      }
    }

    const rule = existing ?? new BoatInstrumentAlertRule()
    rule.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      path: payload.path,
      operator: payload.operator,
      threshold: String(displayToSi(spec.displayUnit, payload.threshold)),
      hysteresis: String(
        hysteresisToSi(spec.displayUnit, payload.threshold, payload.hysteresis ?? 0)
      ),
      severity: payload.severity,
      enabled: payload.enabled ?? true,
    })
    await rule.save()

    // Une règle désactivée ou modifiée ne laisse pas d'alerte périmée ouverte.
    await BoatInstrumentAlert.query()
      .where('ruleId', rule.id)
      .whereNull('clearedAt')
      .update({ clearedAt: DateTime.now() })
    return rule
  }

  async destroy(boat: Pick<Boat, 'id'>, ruleId: number): Promise<void> {
    const rule = await this.findForBoat(boat, ruleId)
    if (!rule) throw new InstrumentAlertRuleNotFoundError()
    await rule.delete()
  }

  private async findForBoat(boat: Pick<Boat, 'id'>, ruleId: number) {
    const rule = await BoatInstrumentAlertRule.query()
      .where('id', ruleId)
      .where('boatId', boat.id)
      .first()
    if (!rule) throw new InstrumentAlertRuleNotFoundError()
    return rule
  }
}
