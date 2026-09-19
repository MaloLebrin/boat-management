/**
 * Vérification de l'adresse e-mail (#768).
 *
 * L'inscription ne prouvait rien : n'importe qui pouvait créer un compte sur
 * l'adresse d'un tiers, et cette adresse est le pivot de l'app — clé de
 * connexion, canal de réinitialisation, cible des invitations, destinataire
 * des factures et des relances.
 */

/**
 * Durée de vie d'un lien de vérification.
 *
 * Plus long que l'heure d'un lien de réinitialisation : celui-ci est envoyé
 * sans que l'utilisateur l'ait demandé, il peut très bien ouvrir sa boîte le
 * lendemain. Plus court que les sept jours d'une invitation, qui engage une
 * organisation tierce et mérite qu'on attende.
 */
export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24

/** Écran de rappel et de renvoi du lien. */
export const EMAIL_VERIFICATION_PATH = '/verify-email'
