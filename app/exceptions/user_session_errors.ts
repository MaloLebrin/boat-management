/**
 * Erreurs métier du registre des sessions (#885).
 */

/** Session introuvable, déjà révoquée, ou appartenant à un autre utilisateur. */
export class UserSessionNotFoundError extends Error {
  constructor() {
    super('User session not found')
    this.name = 'UserSessionNotFoundError'
  }
}

/** La session courante se ferme par la déconnexion, pas par la révocation. */
export class CannotRevokeCurrentSessionError extends Error {
  constructor() {
    super('The current session cannot be revoked from the session list')
    this.name = 'CannotRevokeCurrentSessionError'
  }
}
