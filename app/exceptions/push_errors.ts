export class PushSubscriptionNotFoundError extends Error {
  name = 'PushSubscriptionNotFoundError'
}

/** L'endpoint a été révoqué par le push service (404/410) — l'abonnement doit être purgé. */
export class PushEndpointGoneError extends Error {
  name = 'PushEndpointGoneError'
  constructor(public readonly statusCode: number) {
    super(`Push endpoint gone (${statusCode})`)
  }
}
