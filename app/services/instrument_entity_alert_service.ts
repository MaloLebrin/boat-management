import BoatInstrumentAlert from '#models/boat_instrument_alert'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import type BoatBattery from '#models/boat_battery'
import type BoatTank from '#models/boat_tank'
import type Boat from '#models/boat'
import { INSTRUMENT_ALERT_MAX_RULES_PER_BOAT } from '#shared/constants/instrument_alerts'
import { telemetryPathSpec } from '#shared/constants/instruments'
import { batteryVoltagePath, tankLevelPath } from '#shared/constants/tanks'
import { displayToSi, hysteresisToSi } from '#shared/helpers/instrument_alerts'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/** Marge de retour d'une règle de batterie (V) et de cuve (points de %). */
const BATTERY_HYSTERESIS_V = 0.3
const TANK_HYSTERESIS_PCT = 5

interface LinkedRuleSpec {
  link: 'batteryId' | 'tankId'
  entityId: number
  path: string | null
  threshold: number | null
  hysteresis: number
  severity: 'warning' | 'critical'
}

/**
 * Seuils rattachés à une batterie ou à une cuve (#1037). La règle d'alerte
 * (#993) reste la seule mécanique d'évaluation : l'entité en possède une, qui
 * suit sa clé Signal K, son seuil et son existence. Sans seuil ou sans clé, il
 * n'y a pas de règle (les règles intégrées continuent de couvrir le chemin).
 * Une règle manuelle déjà posée sur le même chemin gagne : on ne la double pas.
 */
export default class InstrumentEntityAlertService {
  async syncBattery(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    battery: BoatBattery,
    trx?: TransactionClientContract
  ) {
    await this.sync(
      boat,
      {
        link: 'batteryId',
        entityId: battery.id,
        path: battery.instrumentKey ? batteryVoltagePath(battery.instrumentKey) : null,
        threshold: battery.lowVoltageV === null ? null : Number(battery.lowVoltageV),
        hysteresis: BATTERY_HYSTERESIS_V,
        severity: 'warning',
      },
      trx
    )
  }

  async syncTank(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    tank: BoatTank,
    trx?: TransactionClientContract
  ) {
    await this.sync(
      boat,
      {
        link: 'tankId',
        entityId: tank.id,
        path: tank.instrumentKey ? tankLevelPath(tank.instrumentKey) : null,
        threshold: tank.lowLevelPct,
        hysteresis: TANK_HYSTERESIS_PCT,
        severity: 'warning',
      },
      trx
    )
  }

  private async sync(
    boat: Pick<Boat, 'id' | 'organizationId'>,
    spec: LinkedRuleSpec,
    trx?: TransactionClientContract
  ) {
    const opts = trx ? { client: trx } : undefined
    const linked = await BoatInstrumentAlertRule.query(opts).where(spec.link, spec.entityId).first()

    if (spec.path === null || spec.threshold === null) {
      await linked?.delete()
      return
    }
    const displaySpec = telemetryPathSpec(spec.path)
    if (!displaySpec) return

    const values = {
      path: spec.path,
      threshold: String(displayToSi(displaySpec.displayUnit, spec.threshold)),
      hysteresis: String(hysteresisToSi(displaySpec.displayUnit, spec.threshold, spec.hysteresis)),
    }

    if (linked) {
      linked.merge(values)
      await linked.save()
      // Un seuil modifié ne laisse pas d'alerte périmée ouverte (même règle que le service de règles).
      await BoatInstrumentAlert.query(opts)
        .where('ruleId', linked.id)
        .whereNull('clearedAt')
        .update({ clearedAt: DateTime.now() })
      return
    }

    const taken = await BoatInstrumentAlertRule.query(opts)
      .where('boatId', boat.id)
      .where('path', spec.path)
      .where('operator', 'lt')
      .first()
    if (taken) return
    const count = await BoatInstrumentAlertRule.query(opts)
      .where('boatId', boat.id)
      .count('* as total')
    if (Number(count[0].$extras.total) >= INSTRUMENT_ALERT_MAX_RULES_PER_BOAT) return

    const rule = new BoatInstrumentAlertRule()
    if (trx) rule.useTransaction(trx)
    rule.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      operator: 'lt',
      severity: spec.severity,
      enabled: true,
      ...values,
      [spec.link]: spec.entityId,
    })
    await rule.save()
  }
}
