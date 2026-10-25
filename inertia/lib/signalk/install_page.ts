import type { AppLocale } from '#shared/helpers/locale_path'

/**
 * Page publique « Installer Signal K à bord » (#1022). Constante isolée tant
 * que `MARKETING_SLUGS.installSignalK` n'est pas sur `main` : à remplacer par
 * `marketingPath('installSignalK', locale)`.
 */
const INSTALL_SIGNALK_PATHS: Record<AppLocale, string> = {
  fr: '/fr/installer-signal-k-a-bord',
  en: '/en/install-signal-k-on-board',
}

export type InstallSignalKAnchor = 'kits' | 'paths' | 'plugin' | 'app' | 'https' | 'troubleshooting'

export function installSignalKPath(locale: AppLocale, anchor?: InstallSignalKAnchor): string {
  return `${INSTALL_SIGNALK_PATHS[locale]}${anchor ? `#${anchor}` : ''}`
}
