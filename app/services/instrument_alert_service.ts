import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import BoatInstrumentAlert from '#models/boat_instrument_alert'
import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import NotificationAudienceService from '#services/notification_audience_service'
import NotificationService from '#services/notification_service'
import TelemetryReadService from '#services/telemetry_read_service'
import { BUILTIN_ALERT_RULES } from '#shared/constants/instrument_alerts'
import { alertOpenKey, evaluateAlerts } from '#shared/helpers/instrument_alerts'
import { toAppLocale } from '#shared/helpers/locale_path'
import type {
  InstrumentAlertRow,
  InstrumentAlertRuleSpec,
  InstrumentAlertTransition,
} from '#shared/types/instruments'
import { toAlertRow } from '#transformers/instrument_transformer'

const RULE_KEY_PREFIX = 'rule:'
const BUILTIN_KEY_PREFIX = 'builtin:'

/**
 * Évaluation serveur des alertes (#993), déclenchée par `TelemetryIngested`.
 * Une alerte est ouverte par règle et par chemin ; son ouverture et sa levée
 * notifient l'équipe (`instrument.alert_opened` / `instrument.alert_cleared`).
 * La décision elle-même vit dans `evaluateAlerts`, partagée avec le client.
 */
@inject()
export default class InstrumentAlertService {
  constructor(
    private readService: TelemetryReadService,
    private notifications: NotificationService,
    private audience: NotificationAudienceService
  ) {}

  /** Alertes ouvertes, la plus récente d'abord. */
  async openForBoat(boat: Pick<Boat, 'id'>): Promise<InstrumentAlertRow[]> {
    const alerts = await BoatInstrumentAlert.query()
      .where('boatId', boat.id)
      .whereNull('clearedAt')
      .orderBy('openedAt', 'desc')
      .orderBy('id', 'desc')
    return alerts.map(toAlertRow)
  }

  /** Règles évaluables d'un bateau : intégrées + règles actives de l'admin. */
  async specsForBoat(boat: Pick<Boat, 'id'>): Promise<InstrumentAlertRuleSpec[]> {
    const rules = await BoatInstrumentAlertRule.query()
      .where('boatId', boat.id)
      .where('enabled', true)
    return [
      ...BUILTIN_ALERT_RULES,
      ...rules.map(
        (rule): InstrumentAlertRuleSpec => ({
          key: `${RULE_KEY_PREFIX}${rule.id}`,
          pathPattern: rule.path,
          kind: 'threshold',
          operator: rule.operator,
          threshold: Number(rule.threshold),
          hysteresis: Number(rule.hysteresis),
          severity: rule.severity,
        })
      ),
    ]
  }

  async evaluate(
    source: Pick<BoatInstrumentSource, 'boatId' | 'organizationId'>,
    paths: readonly string[]
  ): Promise<InstrumentAlertTransition[]> {
    if (paths.length === 0) return []
    const boat = { id: source.boatId }
    const [specs, latest, openAlerts] = await Promise.all([
      this.specsForBoat(boat),
      this.readService.latestForPaths(boat, paths),
      BoatInstrumentAlert.query().where('boatId', source.boatId).whereNull('clearedAt'),
    ])

    const transitions = evaluateAlerts({
      rules: specs,
      samples: [...latest.values()].map((entry) => ({
        path: entry.path,
        value: entry.value,
        valueJson: entry.valueJson,
      })),
      open: new Set(openAlerts.map((alert) => alertOpenKey(alert.ruleKey, alert.path))),
    })

    const applied: InstrumentAlertTransition[] = []
    for (const transition of transitions) {
      if (await this.apply(source, transition, openAlerts)) applied.push(transition)
    }
    return applied
  }

  /** Vrai si l'état a vraiment changé (ouverture ou levée) — `keep` met la valeur à jour seulement. */
  private async apply(
    source: Pick<BoatInstrumentSource, 'boatId' | 'organizationId'>,
    transition: InstrumentAlertTransition,
    openAlerts: readonly BoatInstrumentAlert[]
  ): Promise<boolean> {
    const current = openAlerts.find(
      (alert) => alert.ruleKey === transition.ruleKey && alert.path === transition.path
    )
    const lastValue = transition.value === null ? null : String(transition.value)

    if (transition.decision === 'keep') {
      if (current) {
        current.lastValue = lastValue
        await current.save()
      }
      return false
    }

    if (transition.decision === 'clear') {
      if (!current) return false
      current.clearedAt = DateTime.now()
      current.lastValue = lastValue
      await current.save()
      await this.notify(source, transition, 'alert_cleared')
      return true
    }

    const alert = await BoatInstrumentAlert.create({
      boatId: source.boatId,
      organizationId: source.organizationId,
      ruleId: transition.ruleKey.startsWith(RULE_KEY_PREFIX)
        ? Number(transition.ruleKey.slice(RULE_KEY_PREFIX.length))
        : null,
      ruleKey: transition.ruleKey,
      path: transition.path,
      severity: transition.severity,
      openedAt: DateTime.now(),
      lastValue,
      message: transition.message?.slice(0, 255) ?? null,
    }).catch((error: { code?: string }) => {
      // Deux lots simultanés : l'index unique partiel garde la première.
      if (error.code === '23505') return null
      throw error
    })
    if (!alert) return false
    await this.notify(source, transition, 'alert_opened')
    return true
  }

  private async notify(
    source: Pick<BoatInstrumentSource, 'boatId' | 'organizationId'>,
    transition: InstrumentAlertTransition,
    kind: 'alert_opened' | 'alert_cleared'
  ) {
    try {
      const boat = await Boat.query().where('id', source.boatId).select('id', 'name').firstOrFail()
      const members = await this.audience.staffOf(source.organizationId, null)
      const type = `instrument.${kind}` as const

      await Promise.all(
        members.map((member) => {
          const locale = i18nManager.locale(toAppLocale(member.locale))
          const label = transition.ruleKey.startsWith(BUILTIN_KEY_PREFIX)
            ? locale.formatMessage(
                `instruments.alerts.builtin.${transition.ruleKey.slice(BUILTIN_KEY_PREFIX.length)}`
              )
            : transition.path
          const params = { boatName: boat.name, label: transition.message ?? label }
          return this.notifications.create({
            userId: member.userId,
            organizationId: source.organizationId,
            type,
            severity:
              kind === 'alert_cleared'
                ? 'success'
                : transition.severity === 'critical'
                  ? 'error'
                  : 'warning',
            title: locale.formatMessage(`notifications.messages.${type}.title`, params),
            body: locale.formatMessage(`notifications.messages.${type}.body`, params),
            actionUrl: `/boats/${boat.id}?tab=instruments`,
            metadata: { boatId: boat.id, path: transition.path, ruleKey: transition.ruleKey },
          })
        })
      )
    } catch (error) {
      logger.error({ err: error, boatId: source.boatId }, 'Instrument alert notification failed')
    }
  }
}
