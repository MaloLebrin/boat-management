import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SettingsController = () => import('#controllers/settings_controller')

router
  .group(() => {
    router.get('settings', [SettingsController, 'index']).as('settings.index')
  })
  .use(middleware.auth())

router
  .post('/locale', ({ request, response }) => {
    const locale = request.input('locale')
    if (locale === 'en' || locale === 'fr') {
      response.cookie('locale', locale, { maxAge: '365d', path: '/', httpOnly: false })
    }
    return response.redirect().back()
  })
  .as('locale.set')
  .use(middleware.auth())
