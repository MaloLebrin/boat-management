/** Erreurs métier du chat IA public de diagnostic de panne (#602). */

export class DiagnosisQuotaExhaustedError extends Error {
  name = 'DiagnosisQuotaExhaustedError'
  status = 429
  code = 'E_PUBLIC_DIAGNOSIS_QUOTA_EXHAUSTED'
}

export class DiagnosisConversationNotFoundError extends Error {
  name = 'DiagnosisConversationNotFoundError'
  status = 404
  code = 'E_PUBLIC_DIAGNOSIS_NOT_FOUND'
}

export class DiagnosisConversationCompletedError extends Error {
  name = 'DiagnosisConversationCompletedError'
  status = 409
  code = 'E_PUBLIC_DIAGNOSIS_COMPLETED'
}

export class DiagnosisMaxMessagesReachedError extends Error {
  name = 'DiagnosisMaxMessagesReachedError'
  status = 422
  code = 'E_PUBLIC_DIAGNOSIS_MAX_MESSAGES'
}
