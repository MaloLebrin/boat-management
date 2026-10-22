import { alertOpenKey } from '#shared/helpers/instrument_alerts'
import type { InstrumentAlertRow, InstrumentAlertSeverity } from '#shared/types/instruments'
import type { LocalInstrumentAlert } from '~/composables/use_instrument_stream'

/** Une alerte prête à afficher : celle du serveur, ou détectée à bord et pas encore synchronisée. */
export interface DisplayInstrumentAlert {
  key: string
  ruleKey: string
  path: string
  severity: InstrumentAlertSeverity
  openedAt: number
  /** Valeur en unité SI, `null` pour une alarme Signal K. */
  value: number | null
  message: string | null
  local: boolean
}

/**
 * Fusionne les alertes ouvertes du serveur et celles détectées à bord (#993).
 * Le serveur fait foi : une alerte connue des deux côtés n'apparaît qu'une
 * fois, avec la ligne du serveur. La plus récente d'abord.
 */
export function mergeInstrumentAlerts(
  server: readonly InstrumentAlertRow[],
  local: Readonly<Record<string, LocalInstrumentAlert>>
): DisplayInstrumentAlert[] {
  const byKey = new Map<string, DisplayInstrumentAlert>()
  for (const alert of server) {
    const key = alertOpenKey(alert.ruleKey, alert.path)
    byKey.set(key, {
      key,
      ruleKey: alert.ruleKey,
      path: alert.path,
      severity: alert.severity,
      openedAt: Date.parse(alert.openedAt),
      value: alert.lastValue,
      message: alert.message,
      local: false,
    })
  }
  for (const alert of Object.values(local)) {
    if (byKey.has(alert.key)) continue
    byKey.set(alert.key, { ...alert, local: true })
  }
  return [...byKey.values()].sort((a, b) => b.openedAt - a.openedAt)
}
