import ContactMessage from '#models/contact_message'
import ContactMessageReceived from '#events/contact_message_received'
import { CONTACT_MESSAGE_RETENTION_DAYS } from '#shared/constants/data_retention'
import type { ContactMessageCreateInput } from '#shared/types/contact'
import { DateTime } from 'luxon'

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

  /**
   * Supprime les messages au-delà de la rétention (#775).
   *
   * La table est alimentée **sans authentification** depuis `POST /contact` ;
   * le throttle borne le débit, pas le cumul. Chaque ligne porte un nom, une
   * adresse e-mail, un message libre et une IP : les garder sans limite
   * contredisait la politique de confidentialité publiée.
   *
   * Rend le nombre de lignes supprimées — une purge silencieuse ne se
   * distingue pas d'une purge qui ne tourne plus.
   */
  async purgeExpired(retentionDays = CONTACT_MESSAGE_RETENTION_DAYS): Promise<number> {
    const cutoff = DateTime.now().minus({ days: retentionDays })

    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await ContactMessage.query().where('createdAt', '<', cutoff.toISO()).delete()

    return Number(deleted[0] ?? 0)
  }
}
