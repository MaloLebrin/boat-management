/** Erreurs de l'appairage par code d'un boîtier Signal K (#1032). */

/**
 * Code inconnu **ou** expiré : une seule erreur, pour qu'on ne puisse pas
 * distinguer un code qui a existé d'un code jamais émis (énumération).
 */
export class InstrumentPairingCodeInvalidError extends Error {
  name = 'InstrumentPairingCodeInvalidError'
}

/** Le code a déjà été rattaché à un bateau. */
export class InstrumentPairingAlreadyUsedError extends Error {
  name = 'InstrumentPairingAlreadyUsedError'
}

/** Trop d'essais ratés pour cet utilisateur : plus aucun code n'est vérifié avant la fin de la fenêtre. */
export class InstrumentPairingRateLimitedError extends Error {
  name = 'InstrumentPairingRateLimitedError'

  constructor(readonly retryAfterSeconds: number) {
    super('Too many failed pairing attempts')
  }
}
