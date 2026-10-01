/**
 * Erreurs métier de la double authentification (#884).
 */

/** Activation demandée alors que la 2FA est déjà active. */
export class TwoFactorAlreadyEnabledError extends Error {
  constructor() {
    super('Two-factor authentication is already enabled')
    this.name = 'TwoFactorAlreadyEnabledError'
  }
}

/** Action qui suppose une 2FA active (désactivation, régénération). */
export class TwoFactorNotEnabledError extends Error {
  constructor() {
    super('Two-factor authentication is not enabled')
    this.name = 'TwoFactorNotEnabledError'
  }
}

/** Confirmation sans activation en cours (secret absent ou illisible). */
export class TwoFactorSetupMissingError extends Error {
  constructor() {
    super('No two-factor setup in progress')
    this.name = 'TwoFactorSetupMissingError'
  }
}

/**
 * Second facteur refusé au login. Levée dans le callback de `penalize()` : c'est
 * l'exception qui fait décompter l'essai sur le compteur par compte.
 */
export class InvalidTwoFactorCodeError extends Error {
  constructor() {
    super('Invalid two-factor code')
    this.name = 'InvalidTwoFactorCodeError'
  }
}
