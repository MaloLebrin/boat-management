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
