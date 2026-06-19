import ReminderEmailService from '#services/reminder_email_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

@inject()
export default class SendReminderEmails extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'emails',
    maxRetries: 2,
  }

  constructor(private reminderEmailService: ReminderEmailService) {
    super()
  }

  async execute() {
    logger.info('SendReminderEmails: starting daily reminder run')

    await this.reminderEmailService.sendInactiveAccountReminders()
    await this.reminderEmailService.sendIncompleteBoatReminders()
    await this.reminderEmailService.sendIncompletePortReminders()
    await this.reminderEmailService.sendInactiveLoginReminders()
    await this.reminderEmailService.sendOverdueTaskReminders()
    await this.reminderEmailService.sendEngineTaskReminders()
    await this.reminderEmailService.sendBoatCheckReminders()
    await this.reminderEmailService.sendDocumentExpirationReminders(8, 30)
    await this.reminderEmailService.sendDocumentExpirationReminders(0, 7)

    logger.info('SendReminderEmails: daily reminder run complete')
  }

  async failed(error: Error) {
    logger.error({ error }, 'SendReminderEmails: job failed')
  }
}
