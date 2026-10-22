const BUILTIN_PREFIX = 'builtin:'

/**
 * Libellé d'une alerte d'instrument (#993) : le nom de la règle intégrée, ou
 * le chemin Signal K pour une règle de l'admin.
 */
export function instrumentAlertLabel(
  t: (key: string) => string,
  ruleKey: string,
  path: string
): string {
  return ruleKey.startsWith(BUILTIN_PREFIX)
    ? t(`instruments.alerts.builtin.${ruleKey.slice(BUILTIN_PREFIX.length)}`)
    : path
}
