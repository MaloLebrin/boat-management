import ContactMessage from '#models/contact_message'
import ContactMessageReceived from '#events/contact_message_received'
import type { ContactMessageCreateInput } from '#shared/types/contact'

export default class ContactMessageService {
  /**
   * Persiste un message du formulaire de contact public puis déclenche
   * l'événement qui notifie l'équipe et accuse réception à l'expéditeur.
   */
  async create(input: ContactMessageCreateInput): Promise<ContactMessage> {
    const message = await ContactMessage.create({
      subject: input.subject,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      organization: input.organization ?? null,
      fleetSize: input.fleetSize ?? null,
      message: input.message,
      locale: input.locale === 'fr' ? 'fr' : 'en',
      ipAddress: input.ipAddress ?? null,
    })

    await ContactMessageReceived.dispatch(message)

    return message
  }
}
