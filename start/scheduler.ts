import SendReminderEmails from '#jobs/send_reminder_emails'
import PurgeAuditLogs from '#jobs/purge_audit_logs'
import PurgeProcessedStripeEvents from '#jobs/purge_processed_stripe_events'
import PurgeExpiredTokens from '#jobs/purge_expired_tokens'
import PurgePublicFormData from '#jobs/purge_public_form_data'
import ResetAiTokenUsage from '#jobs/reset_ai_token_usage'
import ResetDemoData from '#jobs/reset_demo_data'
import MarkOverdueInvoices from '#jobs/mark_overdue_invoices'
import SendInvoiceReminders from '#jobs/send_invoice_reminders'
import ScanFleetNotifications from '#jobs/scan_fleet_notifications'
import GenerateAiSuggestions from '#jobs/generate_ai_suggestions'
import ReconcileMedia from '#jobs/reconcile_media'

await SendReminderEmails.schedule({})
  .cron('0 8 * * *')
  .timezone('Europe/Paris')
  .id('daily-reminder-emails')
  .run()

await PurgeAuditLogs.schedule({})
  .cron('0 3 * * *')
  .timezone('Europe/Paris')
  .id('daily-purge-audit-logs')
  .run()

// À 02:00, avant la purge des journaux d'audit : deux suppressions de masse
// qui ne se marchent pas dessus, sur une table sans jointure.
await PurgeProcessedStripeEvents.schedule({})
  .cron('0 2 * * *')
  .timezone('Europe/Paris')
  .id('daily-purge-processed-stripe-events')
  .run()

// Les deux purges de rétention (#775) passent avant celles de 02:00 et 03:00 :
// quatre suppressions de masse qui ne se marchent pas dessus, chacune sur ses
// propres tables. Minuit et minuit trente, plutôt que 01:00, pour ne pas
// croiser le `ResetAiTokenUsage` mensuel.
await PurgeExpiredTokens.schedule({})
  .cron('0 0 * * *')
  .timezone('Europe/Paris')
  .id('daily-purge-expired-tokens')
  .run()

await PurgePublicFormData.schedule({})
  .cron('30 0 * * *')
  .timezone('Europe/Paris')
  .id('daily-purge-public-form-data')
  .run()

await ResetAiTokenUsage.schedule({})
  .cron('0 1 1 * *')
  .timezone('Europe/Paris')
  .id('monthly-reset-ai-token-usage')
  .run()

await ResetDemoData.schedule({})
  .cron('0 4 * * *')
  .timezone('Europe/Paris')
  .id('daily-reset-demo-data')
  .run()

await MarkOverdueInvoices.schedule({})
  .cron('0 6 * * *')
  .timezone('Europe/Paris')
  .id('daily-mark-overdue-invoices')
  .run()

// À 06:30, après le passage en retard de 06:00 : les relances partent sur des
// statuts à jour, avant l'ouverture des bureaux (#878).
await SendInvoiceReminders.schedule({})
  .cron('30 6 * * *')
  .timezone('Europe/Paris')
  .id('daily-send-invoice-reminders')
  .run()

await ScanFleetNotifications.schedule({})
  .cron('0 7 * * *')
  .timezone('Europe/Paris')
  .id('daily-scan-fleet-notifications')
  .run()

// À 05:00, avant le scan de notifications de 07:00 : les notifications
// « nouvelles suggestions IA » partent avec la fournée du matin.
await GenerateAiSuggestions.schedule({})
  .cron('0 5 * * *')
  .timezone('Europe/Paris')
  .id('daily-generate-ai-suggestions')
  .run()

// Le dimanche à 03:30, après la purge des journaux d'audit de 03:00 et avant
// la remise à zéro de la démo de 04:00 : médias orphelins et compteurs de
// stockage réconciliés une fois par semaine (#859).
await ReconcileMedia.schedule({})
  .cron('30 3 * * 0')
  .timezone('Europe/Paris')
  .id('weekly-reconcile-media')
  .run()
