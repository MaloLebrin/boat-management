/** Erreurs métier du chat IA de recherche de références de pièces (#634). */

export class PartSearchConversationNotFoundError extends Error {
  name = 'PartSearchConversationNotFoundError'
  status = 404
  code = 'E_PART_SEARCH_NOT_FOUND'
}

export class PartSearchConversationCompletedError extends Error {
  name = 'PartSearchConversationCompletedError'
  status = 409
  code = 'E_PART_SEARCH_COMPLETED'
}

export class PartSearchMaxMessagesReachedError extends Error {
  name = 'PartSearchMaxMessagesReachedError'
  status = 422
  code = 'E_PART_SEARCH_MAX_MESSAGES'
}

/** Conversations gratuites du chat public épuisées (anonyme ou plan sans IA). */
export class PartSearchQuotaExhaustedError extends Error {
  name = 'PartSearchQuotaExhaustedError'
  status = 429
  code = 'E_PART_SEARCH_QUOTA_EXHAUSTED'
}
