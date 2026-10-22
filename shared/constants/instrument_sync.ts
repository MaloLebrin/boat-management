/**
 * Réglages de la synchronisation métier des instruments (#991).
 *
 * Une ligne de position ouverte depuis moins de cinq minutes et à moins de
 * cent mètres du nouveau fix est **mise à jour en place** : un bateau au
 * mouillage ne produit pas une ligne par lot. Au-delà, on clôt et on ouvre.
 */
export const POSITION_UPDATE_MAX_AGE_MIN = 5
export const POSITION_UPDATE_MAX_DISTANCE_M = 100

/** Espacement des points de journal automatiques sur une sortie en cours. */
export const INSTRUMENT_LOG_ENTRY_INTERVAL_MIN = 10
