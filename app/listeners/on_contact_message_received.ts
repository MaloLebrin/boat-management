import type ContactMessageReceived from '#events/contact_message_received'
import EmailQueueService from '#services/email_queue_service'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

@inject()
export default class OnContactMessageReceived {
  constructor(private emailQueueService: EmailQueueService) {}

  async handle(event: ContactMessageReceived) {
    const message = event.message
    const inbox = env.get('CONTACT_INBOX_EMAIL') || env.get('MAIL_FROM_ADDRESS')
    const i18n = i18nManager.locale(message.locale)
    const subjectLabel = i18n.formatMessage(`marketing.contact2.form_subject_${message.subject}`)

    await this.emailQueueService.sendContactMessageNotification({
      to: inbox,
      messageId: message.id,
      subjectLabel,
      fullName: `${message.firstName} ${message.lastName}`,
      email: message.email,
      organization: message.organization,
      fleetSize: message.fleetSize,
      message: message.message,
      locale: message.locale,
    })

    await this.emailQueueService.sendContactMessageAck({
      to: message.email,
      messageId: message.id,
      firstName: message.firstName,
      message: message.message,
      locale: message.locale,
    })
  }
}
