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

/**
 * Confirmation d'une action que le rôle ou le plan effectif n'autorise plus —
 * les gardes sont re-vérifiées à l'exécution, le plan peut avoir changé entre
 * la proposition et le clic.
 */
export class AssistantActionNotAllowedError extends Error {
  name = 'AssistantActionNotAllowedError'
  status = 403
  code = 'E_ASSISTANT_ACTION_NOT_ALLOWED'
}

/**
 * L'entité visée par l'action a disparu entre la proposition et la
 * confirmation (pièce supprimée, sortie déjà clôturée…).
 */
export class AssistantActionEntityGoneError extends Error {
  name = 'AssistantActionEntityGoneError'
  status = 409
  code = 'E_ASSISTANT_ACTION_ENTITY_GONE'
}

/**
 * Proposition refusée parce que l'état de la flotte ne permet pas de
 * l'exécuter (clôturer une sortie alors qu'aucune n'est ouverte). Ce n'est PAS
 * une réponse malformée : le tour n'est pas jeté, `AssistantChatService` le
 * dégrade en réponse conversationnelle qui explique le blocage.
 */
export type AssistantNotExecutableReason = 'no_trip_in_progress'

export class AssistantActionNotExecutableError extends Error {
  name = 'AssistantActionNotExecutableError'
  status = 409
  code = 'E_ASSISTANT_ACTION_NOT_EXECUTABLE'

  constructor(readonly reason: AssistantNotExecutableReason) {
    super(`Assistant action is not executable: ${reason}`)
  }
}
