import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SettingsController = () => import('#controllers/settings_controller')

router
  .group(() => {
    router.get('settings', [SettingsController, 'index']).as('settings.index')
  })
  .use(middleware.auth())
