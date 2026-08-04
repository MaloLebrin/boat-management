import type ContactMessage from '#models/contact_message'
import { BaseEvent } from '@adonisjs/core/events'

export default class ContactMessageReceived extends BaseEvent {
  constructor(public readonly message: ContactMessage) {
    super()
  }
}
