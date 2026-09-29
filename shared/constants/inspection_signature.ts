/**
 * Signature manuscrite d'un état des lieux (#889) — bornes partagées entre le
 * pad (frontend) et le validateur.
 */

/** Préfixe exigé : le pad n'exporte que du PNG. */
export const SIGNATURE_DATA_URL_PREFIX = 'data:image/png;base64,'

/**
 * Longueur maximale de l'URL `data:` d'un tracé. Un pad de 600 × 200 px exporte
 * 10 à 40 Ko ; 300 000 caractères (≈ 220 Ko décodés) laissent de la marge sans
 * ouvrir la porte à une image arbitraire.
 */
export const SIGNATURE_DATA_URL_MAX_LENGTH = 300_000

/** Photos reproduites dans le PDF par inspection ; au-delà, une mention « + N ». */
export const INSPECTION_PDF_MAX_PHOTOS = 12

/**
 * Encre du pad : le tracé est un PNG destiné au papier (le PDF), pas un
 * élément de l'interface — il reste sombre quel que soit le thème, sur un pad
 * toujours clair.
 */
export const SIGNATURE_INK_COLOR = '#0b1d2e'
