export class AiAnalysisFailedError extends Error {
  name = 'AiAnalysisFailedError'
  status = 500
  code = 'E_AI_ANALYSIS_FAILED'
}

export class AiQuotaExceededError extends Error {
  name = 'AiQuotaExceededError'
  status = 429
  code = 'E_AI_QUOTA_EXCEEDED'
}

export class AiInvalidResponseError extends Error {
  name = 'AiInvalidResponseError'
  status = 500
  code = 'E_AI_INVALID_RESPONSE'
}

/**
 * Appel IA vers un fournisseur BYOK (`anthropic`, `openai`, `google`) sans clé
 * API — seul `mistral` a un repli sur la clé de l'app. Aussi levée quand on
 * tente de sélectionner comme fournisseur actif un fournisseur sans clé
 * enregistrée.
 */
export class AiProviderKeyMissingError extends Error {
  name = 'AiProviderKeyMissingError'
  status = 422
  code = 'E_AI_PROVIDER_KEY_MISSING'

  constructor(provider: string) {
    super(`No API key configured for AI provider "${provider}"`)
  }
}

/**
 * Le fournisseur IA n'a pas répondu dans le délai imparti (#853) :
 * `AI_CHAT_TIMEOUT_MS` pour un tour de chat, `AI_ANALYSIS_TIMEOUT_MS` pour une
 * analyse. L'appel est annulé, et les tokens réservés sont libérés par le
 * `finally` de `withReservedTokens`.
 */
export class AiProviderTimeoutError extends Error {
  name = 'AiProviderTimeoutError'
  status = 504
  code = 'E_AI_PROVIDER_TIMEOUT'

  constructor(timeoutMs: number) {
    super(`AI provider did not answer within ${timeoutMs} ms`)
  }
}
