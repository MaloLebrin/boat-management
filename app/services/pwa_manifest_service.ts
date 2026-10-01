import type { I18n } from '@adonisjs/i18n'
import {
  PWA_ICON_192,
  PWA_ICON_512,
  PWA_ID,
  PWA_SCOPE,
  PWA_SCREENSHOTS,
  PWA_SHORTCUT_ICON,
  PWA_SHORTCUTS,
  PWA_START_URL,
} from '#shared/constants/pwa'
import type { WebAppManifest, WebAppManifestIcon } from '#shared/types/pwa'

const SHORTCUT_ICON: WebAppManifestIcon = {
  src: PWA_SHORTCUT_ICON,
  sizes: '96x96',
  type: 'image/png',
}

/**
 * Manifest d'installation (#865). Le fichier statique ne peut pas suivre la
 * locale : le navigateur envoie `Accept-Language` (ou le cookie `locale`)
 * et cette réponse porte `name`/`description`/raccourcis dans cette langue.
 * La marque `FleetAi` ne se traduit pas.
 */
export default class PwaManifestService {
  build(i18n: I18n): WebAppManifest {
    return {
      id: PWA_ID,
      name: 'FleetAi',
      short_name: 'FleetAi',
      description: i18n.t('common.pwa.manifest.description'),
      lang: i18n.locale,
      dir: 'ltr',
      start_url: PWA_START_URL,
      scope: PWA_SCOPE,
      display: 'standalone',
      orientation: 'any',
      theme_color: '#0b1d2e',
      background_color: '#ffffff',
      categories: ['productivity', 'business'],
      icons: [
        { src: PWA_ICON_192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: PWA_ICON_512, sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
      ],
      shortcuts: PWA_SHORTCUTS.map((shortcut) => ({
        name: i18n.t(`common.pwa.shortcuts.${shortcut.key}`),
        short_name: i18n.t(`common.pwa.shortcuts.${shortcut.key}Short`),
        url: shortcut.path,
        icons: [SHORTCUT_ICON],
      })),
      screenshots: PWA_SCREENSHOTS.map((screenshot) => ({
        src: screenshot.src,
        sizes: screenshot.sizes,
        type: 'image/png',
        form_factor: screenshot.formFactor,
        label: i18n.t(`common.pwa.manifest.screenshot.${screenshot.labelKey}`),
      })),
    }
  }
}
