import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { preferencesThrottle } from '#start/limiter'
import { AI_PROVIDERS } from '#shared/types/ai'

// Un fournisseur inconnu ne matche pas la route → 404 natif (pas de 500).
const AI_PROVIDER_MATCHER = new RegExp(`^(${AI_PROVIDERS.join('|')})$`)

const SettingsController = () => import('#controllers/settings_controller')
const BillingController = () => import('#controllers/billing_controller')
const AuditLogsController = () => import('#controllers/audit_logs_controller')
const CsvImportController = () => import('#controllers/csv_import_controller')
const OnlinePaymentsController = () => import('#controllers/online_payments_controller')
const InvoiceRemindersController = () => import('#controllers/invoice_reminders_controller')
const AccountingSettingsController = () => import('#controllers/accounting_settings_controller')
const DataExportsController = () => import('#controllers/data_exports_controller')
const TwoFactorSettingsController = () => import('#controllers/two_factor_settings_controller')

// Préférences pré-auth (switchers de langue et de thème, aussi disponibles
// sur le marketing et l'écran de login) : persistées sur le profil quand
// l'utilisateur est connecté, en cookie sinon.
router.post('/locale', [SettingsController, 'setLocale']).as('locale.set').use(preferencesThrottle)
router.post('/theme', [SettingsController, 'setTheme']).as('theme.set').use(preferencesThrottle)

router
  .group(() => {
    router.get('settings', ({ response }) => response.redirect('/settings/me')).as('settings.index')
    router.get('settings/me', [SettingsController, 'me']).as('settings.me')
    // Double authentification (#884).
    router
      .post('settings/two-factor', [TwoFactorSettingsController, 'store'])
      .as('settings.two_factor.store')
    router
      .post('settings/two-factor/confirm', [TwoFactorSettingsController, 'confirm'])
      .as('settings.two_factor.confirm')
    router
      .delete('settings/two-factor/setup', [TwoFactorSettingsController, 'cancel'])
      .as('settings.two_factor.cancel')
    router
      .delete('settings/two-factor', [TwoFactorSettingsController, 'destroy'])
      .as('settings.two_factor.destroy')
    router
      .post('settings/two-factor/recovery-codes', [
        TwoFactorSettingsController,
        'regenerateRecoveryCodes',
      ])
      .as('settings.two_factor.recovery_codes')
    router
      .put('settings/org/two-factor', [TwoFactorSettingsController, 'updateOrganizationPolicy'])
      .as('settings.org.two_factor')
    router
      .get('settings/notifications', [SettingsController, 'notifications'])
      .as('settings.notifications')
    router.get('settings/org', [SettingsController, 'org']).as('settings.org')
    router.get('settings/members', [SettingsController, 'members']).as('settings.members')
    router.get('settings/billing', [SettingsController, 'billing']).as('settings.billing')
    router
      .post('settings/billing/checkout', [BillingController, 'checkout'])
      .as('settings.billing.checkout')
      // Passer au paiement engage de l'argent sur une adresse dont rien ne
      // prouve encore qu'elle appartient à l'inscrit (#768). Le portail
      // Stripe, lui, reste ouvert : un client déjà payant doit pouvoir gérer
      // son abonnement, y compris le résilier.
      .use(middleware.requireVerifiedEmail())
    router
      .post('settings/billing/portal', [BillingController, 'portal'])
      .as('settings.billing.portal')
    router
      .post('settings/billing/module', [BillingController, 'addModule'])
      .as('settings.billing.module.add')
    router
      .delete('settings/billing/module', [BillingController, 'removeModule'])
      .as('settings.billing.module.remove')
    router
      .post('settings/billing/module/enterprise', [BillingController, 'activateEnterpriseModule'])
      .as('settings.billing.module.enterprise.activate')
    router
      .delete('settings/billing/module/enterprise', [
        BillingController,
        'deactivateEnterpriseModule',
      ])
      .as('settings.billing.module.enterprise.deactivate')
    router
      .post('settings/billing/addon', [BillingController, 'setAddon'])
      .as('settings.billing.addon.set')
    // Compte Stripe connecté de l'organisation (#876) : l'argent des clients
    // y arrive — même exigence d'adresse vérifiée que le passage au paiement.
    router
      .post('settings/billing/online-payments', [OnlinePaymentsController, 'connect'])
      .as('settings.billing.onlinePayments.connect')
      .use(middleware.requireVerifiedEmail())
    router
      .get('settings/billing/online-payments/refresh', [OnlinePaymentsController, 'refresh'])
      .as('settings.billing.onlinePayments.refresh')
      .use(middleware.requireVerifiedEmail())
    router
      .get('settings/billing/online-payments/return', [OnlinePaymentsController, 'return'])
      .as('settings.billing.onlinePayments.return')
    router
      .delete('settings/billing/online-payments', [OnlinePaymentsController, 'disconnect'])
      .as('settings.billing.onlinePayments.disconnect')
    // Relances automatiques des factures en retard (#878).
    router
      .patch('settings/billing/invoice-reminders', [InvoiceRemindersController, 'updateSettings'])
      .as('settings.billing.invoiceReminders.update')
    router
      .put('settings/profile', [SettingsController, 'updateProfile'])
      .as('settings.profile.update')
    router
      .put('settings/password', [SettingsController, 'changePassword'])
      .as('settings.password.update')
    router.put('settings/locale', [SettingsController, 'updateLocale']).as('settings.locale.update')
    router.put('settings/theme', [SettingsController, 'updateTheme']).as('settings.theme.update')
    router.put('settings/org', [SettingsController, 'updateOrganization']).as('settings.org.update')
    router.get('settings/ai', [SettingsController, 'ai']).as('settings.ai')
    router.put('settings/ai', [SettingsController, 'updateAiSettings']).as('settings.ai.update')
    router
      .put('settings/ai/provider', [SettingsController, 'updateAiProvider'])
      .as('settings.ai.provider.update')
    router
      .put('settings/ai/api-key/:provider', [SettingsController, 'updateAiApiKey'])
      .as('settings.ai.apiKey.update')
      .where('provider', AI_PROVIDER_MATCHER)
    router
      .delete('settings/ai/api-key/:provider', [SettingsController, 'removeAiApiKey'])
      .as('settings.ai.apiKey.remove')
      .where('provider', AI_PROVIDER_MATCHER)
    router.get('settings/audit-log', [AuditLogsController, 'index']).as('settings.auditLog')
    router.get('settings/branding', [SettingsController, 'branding']).as('settings.branding')
    router
      .put('settings/branding', [SettingsController, 'updateBranding'])
      .as('settings.branding.update')
    router
      .post('settings/branding/logo', [SettingsController, 'uploadLogo'])
      .as('settings.branding.logo.upload')
    router
      .delete('settings/branding/logo', [SettingsController, 'deleteLogo'])
      .as('settings.branding.logo.delete')
    // Exports comptables (#879) : comptes du FEC, exports générés en
    // arrière-plan et leur téléchargement par lien signé.
    router
      .put('settings/billing/accounting', [AccountingSettingsController, 'update'])
      .as('settings.billing.accounting.update')
    router.get('settings/exports', [DataExportsController, 'index']).as('settings.exports')
    router.get('exports/:id/download', [DataExportsController, 'download']).as('exports.download')
    router.get('settings/import', [CsvImportController, 'show']).as('settings.import')
    router
      .post('settings/import/preview', [CsvImportController, 'preview'])
      .as('settings.import.preview')
    router
      .post('settings/import/confirm', [CsvImportController, 'confirm'])
      .as('settings.import.confirm')
    router
      .post('settings/import/cancel', [CsvImportController, 'cancel'])
      .as('settings.import.cancel')
  })
  .use(middleware.auth())
