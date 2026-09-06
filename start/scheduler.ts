import SendReminderEmails from '#jobs/send_reminder_emails'
import PurgeAuditLogs from '#jobs/purge_audit_logs'
import ResetAiTokenUsage from '#jobs/reset_ai_token_usage'
import ResetDemoData from '#jobs/reset_demo_data'
import MarkOverdueInvoices from '#jobs/mark_overdue_invoices'
import ScanFleetNotifications from '#jobs/scan_fleet_notifications'
import GenerateAiSuggestions from '#jobs/generate_ai_suggestions'

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
