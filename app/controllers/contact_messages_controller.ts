import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ContactMessageService from '#services/contact_message_service'
import { contactMessageValidator } from '#validators/contact'

@inject()
export default class ContactMessagesController {
  constructor(private contactMessageService: ContactMessageService) {}

  /**
   * Formulaire de contact public (#450) — répond par redirection Inertia,
   * le message de succès est lu depuis le flash par la page.
   */
  async store({ request, response, session, i18n }: HttpContext) {
    const payload = await request.validateUsing(contactMessageValidator)

    await this.contactMessageService.create({
      ...payload,
      locale: payload.locale ?? i18n.locale,
      ipAddress: request.ip(),
    })

    session.flash('contactMessageSent', true)

    return response.redirect().back()
  }
}
