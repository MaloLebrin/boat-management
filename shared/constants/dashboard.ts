/**
 * Nombre de lignes de maintenance urgente affichées sur le tableau de bord :
 * au-delà, un lien renvoie vers le planning. Le service en renvoie jusqu'à 10
 * (`urgentLimit` de `DashboardService`) — #828.
 */
export const URGENT_DISPLAY_CAP = 5

/** Lignes affichées dans « À traiter » ; au-delà, « Voir les N autres » (#832). */
export const ATTENTION_DISPLAY_CAP = 6
/** Lignes remontées par type (incidents, documents, factures) avant fusion. */
export const ATTENTION_FETCH_PER_KIND = 6
/** Lignes du fil « Activité récente ». */
export const ACTIVITY_DISPLAY_CAP = 8
/** Sorties en cours affichées dans « En mer maintenant ». */
export const ACTIVE_TRIPS_DISPLAY_CAP = 5
/** Fenêtre glissante (jours) des KPI « Sorties » et « Tâches réalisées ». */
export const PULSE_WINDOW_DAYS = 30
/** Fenêtre (jours) des « Prochains départs et retours » (module Location). */
export const UPCOMING_RESERVATIONS_DAYS = 7
export const UPCOMING_RESERVATIONS_CAP = 5
