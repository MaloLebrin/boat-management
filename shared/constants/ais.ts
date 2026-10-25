/**
 * Cibles AIS via Signal K (#1009, épopée #986). Les cibles sont d'autres
 * contextes Signal K (`vessels.urn:mrn:imo:mmsi:<mmsi>`), pas des mesures du
 * bateau : elles voyagent dans le lot de télémétrie sous un chemin synthétique
 * `ais.<mmsi>` (valeur structurée), ce qui laisse la file hors ligne, le
 * sous-échantillonnage et l'idempotence inchangés.
 */

export const AIS_PATH_PREFIX = 'ais.'

/** Un MMSI est un numéro à neuf chiffres. */
export const AIS_MMSI_PATTERN = /^\d{9}$/

/** Cibles gardées à l'écran : les plus proches. */
export const AIS_MAX_TARGETS = 50

/** Rafraîchissement de l'affichage (par cible et pour la liste), en ms. */
export const AIS_DISPLAY_REFRESH_MS = 5000

/** Une cible muette depuis ce délai disparaît de l'écran, en ms. */
export const AIS_TARGET_EXPIRY_MS = 10 * 60_000

/** Fenêtre d'enregistrement d'une cible, en secondes (un relevé par fenêtre). */
export const AIS_SIGHTING_WINDOW_S = 300

/** Dernières cibles relues du serveur pour la fiche hors flux, en minutes. */
export const AIS_RECENT_WINDOW_MIN = 30

/** Signal K : zone `vessels.*` abonnée pour les cibles. */
export const AIS_SUBSCRIBE_CONTEXT = 'vessels.*'

/** Seuils du badge « risque » : CPA sous 0,5 mille et TCPA sous 20 min. */
export const AIS_RISK_CPA_M = 926
export const AIS_RISK_TCPA_S = 20 * 60

/** Longueur maximale d'un nom de cible conservé. */
export const AIS_NAME_MAX_LENGTH = 120
