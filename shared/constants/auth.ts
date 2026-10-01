/**
 * Contraintes de mot de passe — source de vérité unique (#455).
 *
 * `app/validators/user.ts` les applique côté serveur et le formulaire signup
 * les affiche à l'utilisateur : sans constante partagée, le placeholder
 * annonçait « 14 caractères minimum » pendant que le validator imposait 8–32,
 * et la borne haute n'était indiquée nulle part.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 32

/**
 * Clé de session qui porte le token de réinitialisation entre le `GET
 * /reset-password?token=…` et le rendu du formulaire (#770).
 *
 * Le lien envoyé par e-mail porte forcément le token en query string — c'est
 * un lien. Ce qu'on peut éviter, c'est qu'il y **reste** : le `GET` l'échange
 * contre cette valeur de session et rejoue la page sans query string. Le token
 * ne traverse donc l'URL que le temps d'une requête, au lieu de rester dans
 * l'historique du navigateur et dans les journaux d'accès du reverse proxy.
 */
export const PASSWORD_RESET_TOKEN_SESSION_KEY = 'passwordResetToken'

/**
 * Instant auquel la session authentifiée courante a été vue pour la première
 * fois (#763).
 *
 * Comparé à `users.sessions_valid_after` par `RevokedSessionMiddleware` :
 * c'est ce couple qui permet de révoquer les sessions ouvertes avant une
 * réinitialisation de mot de passe, alors même que `SESSION_DRIVER=cookie`
 * les rend non listables côté serveur.
 */
export const AUTH_SESSION_STARTED_AT_KEY = 'authSessionStartedAt'

/**
 * Clé de session qui porte l'identifiant de la ligne `user_sessions` de la
 * session courante (#885). Posée au login ; une session dont la ligne est
 * révoquée est déconnectée par `SessionRegistryMiddleware`.
 */
export const AUTH_SESSION_RECORD_KEY = 'authSessionRecordId'

/**
 * Intervalle minimal entre deux mises à jour de `last_seen_at` (#885) : la
 * ligne est lue à chaque requête authentifiée, mais n'est réécrite qu'au plus
 * une fois par intervalle.
 */
export const SESSION_TOUCH_INTERVAL_MINUTES = 15

/**
 * Inactivité au-delà de laquelle une session sans remember-me est expirée —
 * aligné sur `age: '5d'` de `config/session.ts`.
 */
export const SESSION_IDLE_DAYS = 5

/**
 * Durée de conservation d'une ligne `user_sessions` après sa dernière
 * activité (#885). Au-delà, le job de purge la supprime ; d'ici là elle sert
 * à reconnaître un appareil déjà vu (pas d'e-mail « nouvelle connexion »).
 */
export const SESSION_RETENTION_DAYS = 90
