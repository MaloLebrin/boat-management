/** Erreurs métier du copilote FleetAi. */

export class AssistantConversationNotFoundError extends Error {
  name = 'AssistantConversationNotFoundError'
  status = 404
  code = 'E_ASSISTANT_NOT_FOUND'
}

export class AssistantMaxMessagesReachedError extends Error {
  name = 'AssistantMaxMessagesReachedError'
  status = 422
  code = 'E_ASSISTANT_MAX_MESSAGES'
}

/** Une proposition de tâche attend une réponse — le fil est suspendu. */
export class AssistantPendingActionRequiredError extends Error {
  name = 'AssistantPendingActionRequiredError'
  status = 409
  code = 'E_ASSISTANT_ACTION_PENDING'
}

/** Confirmation/refus sans proposition en attente (double-clic, onglet périmé). */
export class AssistantNoPendingActionError extends Error {
  name = 'AssistantNoPendingActionError'
  status = 409
  code = 'E_ASSISTANT_NO_PENDING_ACTION'
}

/** Plafond de tokens de la conversation atteint — en démarrer une nouvelle. */
export class AssistantConversationBudgetExceededError extends Error {
  name = 'AssistantConversationBudgetExceededError'
  status = 422
  code = 'E_ASSISTANT_BUDGET_EXCEEDED'
}

/** L'appel Mistral a échoué avec la clé API propre à l'org (BYOK invalide ?). */
export class AssistantCustomKeyFailedError extends Error {
  name = 'AssistantCustomKeyFailedError'
  status = 502
  code = 'E_ASSISTANT_CUSTOM_KEY_FAILED'
}
