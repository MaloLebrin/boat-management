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
