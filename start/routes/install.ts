import router from '@adonisjs/core/services/router'
import { SIGNALK_PLUGIN_INSTALL_PATH } from '#shared/constants/instruments'

const InstallScriptsController = () => import('#controllers/install_scripts_controller')

/**
 * Scripts d'installation servis en clair (#1021) : publics (le serveur du bord
 * n'a pas de session), lus depuis `resources/install/` — pas `public/`, dont le
 * middleware statique passerait avant la route avec un mauvais type MIME.
 * Exclus du service worker (`inertia/sw.ts`) et de `robots.txt`.
 */
router
  .get(SIGNALK_PLUGIN_INSTALL_PATH, [InstallScriptsController, 'signalkPlugin'])
  .as('install.signalkPlugin')
