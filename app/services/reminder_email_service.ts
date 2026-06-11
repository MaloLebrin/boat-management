import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

/**
 * Orchestrates all reminder email campaigns.
 * Each method targets a specific inactivity or maintenance scenario.
 * Implemented incrementally: user reminders in PR-2, maintenance reminders in PR-3.
 */
@inject()
export default class ReminderEmailService {
  async sendInactiveAccountReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendInactiveAccountReminders: not yet implemented')
  }

  async sendIncompleteBoatReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendIncompleteBoatReminders: not yet implemented')
  }

  async sendIncompletePortReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendIncompletePortReminders: not yet implemented')
  }

  async sendInactiveLoginReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendInactiveLoginReminders: not yet implemented')
  }

  async sendOverdueTaskReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendOverdueTaskReminders: not yet implemented')
  }

  async sendEngineTaskReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendEngineTaskReminders: not yet implemented')
  }

  async sendBoatCheckReminders(): Promise<void> {
    logger.info('ReminderEmailService.sendBoatCheckReminders: not yet implemented')
  }
}
