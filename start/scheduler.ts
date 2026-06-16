import SendReminderEmails from '#jobs/send_reminder_emails'
import PurgeAuditLogs from '#jobs/purge_audit_logs'
import ResetAiTokenUsage from '#jobs/reset_ai_token_usage'

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
