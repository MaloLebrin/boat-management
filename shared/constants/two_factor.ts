/**
 * Double authentification TOTP (#884) — constantes partagées entre le
 * service, les contrôleurs et les écrans.
 */

/** Chiffres d'un code TOTP (RFC 6238 — ce qu'affichent toutes les applis). */
export const TOTP_DIGITS = 6

/** Pas de temps en secondes (RFC 6238, valeur universelle des applis). */
export const TOTP_PERIOD_SECONDS = 30

/**
 * Pas tolérés de part et d'autre de l'instant courant : ±1, soit un code
 * accepté jusqu'à 30 s avant ou après sa fenêtre — la dérive d'horloge d'un
 * téléphone et le temps de saisie, sans élargir la surface de devinette.
 */
export const TOTP_WINDOW = 1

/** Libellé de l'émetteur dans l'appli d'authentification. */
export const TOTP_ISSUER = 'FleetAi'

/** Codes de secours générés à l'activation (et à chaque régénération). */
export const RECOVERY_CODES_COUNT = 8

/**
 * Durée de l'état « pré-authentifié » entre le mot de passe et le second
 * facteur : au-delà, il faut ressaisir le mot de passe.
 */
export const TWO_FACTOR_CHALLENGE_TTL_MINUTES = 5

/** Clé de session de l'état pré-authentifié. */
export const TWO_FACTOR_PENDING_SESSION_KEY = 'twoFactorPending'

/**
 * Clé flash des codes de secours en clair : affichés **une seule fois**, à la
 * page qui suit l'activation ou la régénération.
 */
export const TWO_FACTOR_RECOVERY_CODES_FLASH_KEY = 'twoFactorRecoveryCodes'

/** Délai de grâce maximal (jours) d'une politique d'organisation. */
export const TWO_FACTOR_MAX_GRACE_DAYS = 30

/** Écran d'activation, cible de la politique d'organisation. */
export const TWO_FACTOR_SETUP_PATH = '/settings/me'

/** Écran du second facteur à la connexion. */
export const TWO_FACTOR_CHALLENGE_PATH = '/login/2fa'
