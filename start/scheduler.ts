import SendReminderEmails from '#jobs/send_reminder_emails'
import PurgeAuditLogs from '#jobs/purge_audit_logs'

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
