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
