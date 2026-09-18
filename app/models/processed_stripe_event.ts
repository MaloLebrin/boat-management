import { ProcessedStripeEventSchema } from '#database/schema'

/**
 * Trace d'un événement Stripe déjà traité (#703).
 *
 * Stripe livre **au moins une fois**, jamais exactement une fois : il rejoue à
 * chaque réponse non-2xx, et parfois après un 2xx. Cette table est ce qui rend
 * `POST /webhooks/stripe` idempotent — avant elle, le rejeu n'était inoffensif
 * que par effet de bord (l'upsert de synchro réécrivait les mêmes valeurs), et
 * la moindre écriture non idempotente ajoutée au chemin — compteur, ligne
 * d'historique, notification, écriture comptable — l'aurait dupliquée.
 */
export default class ProcessedStripeEvent extends ProcessedStripeEventSchema {
  // Explicite, comme la plupart des modèles du dépôt : la classe de base
  // générée s'appelle `ProcessedStripeEventSchema`, et lire `.table` avant que
  // Lucid n'ait booté la sous-classe rendrait `processed_stripe_event_schemas`.
  static table = 'processed_stripe_events'
}
