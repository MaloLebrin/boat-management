import { marketingPath, type AppLocale } from '#shared/helpers/locale_path'

export type InstallSignalKAnchor = 'kits' | 'paths' | 'plugin' | 'app' | 'https' | 'troubleshooting'

/** Page publique « Installer Signal K à bord » (#1022), avec ancre facultative. */
export function installSignalKPath(locale: AppLocale, anchor?: InstallSignalKAnchor): string {
  return `${marketingPath('installSignalK', locale)}${anchor ? `#${anchor}` : ''}`
}
