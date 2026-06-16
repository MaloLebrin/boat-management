import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SettingsController = () => import('#controllers/settings_controller')
const BillingController = () => import('#controllers/billing_controller')

router
  .post('/locale', ({ request, response }) => {
    const locale = request.input('locale')
    if (locale === 'en' || locale === 'fr') {
      // httpOnly: false is intentional — the JS language switcher reads this cookie client-side
      response.cookie('locale', locale, { maxAge: '365d', path: '/', httpOnly: false })
    }
    return response.redirect().back()
  })
  .as('locale.set')

router
  .group(() => {
    router.get('settings', ({ response }) => response.redirect('/settings/me')).as('settings.index')
    router.get('settings/me', [SettingsController, 'me']).as('settings.me')
    router.get('settings/org', [SettingsController, 'org']).as('settings.org')
    router.get('settings/members', [SettingsController, 'members']).as('settings.members')
    router.get('settings/billing', [SettingsController, 'billing']).as('settings.billing')
    router
      .post('settings/billing/checkout', [BillingController, 'checkout'])
      .as('settings.billing.checkout')
    router
      .post('settings/billing/portal', [BillingController, 'portal'])
      .as('settings.billing.portal')
    router
      .put('settings/profile', [SettingsController, 'updateProfile'])
      .as('settings.profile.update')
    router.put('settings/org', [SettingsController, 'updateOrganization']).as('settings.org.update')
    router.get('settings/ai', [SettingsController, 'ai']).as('settings.ai')
    router.put('settings/ai', [SettingsController, 'updateAiSettings']).as('settings.ai.update')
  })
  .use(middleware.auth())
