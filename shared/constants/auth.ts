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
