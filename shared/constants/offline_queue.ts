/**
 * Identifiants des actions de la file hors-ligne (#481). Partagés backend ↔
 * frontend : le composant les pose à l'`enqueue`, le contrôleur les renvoie
 * dans les flashs `rejectedType`, `conflictType` et `createdResourceType`, et
 * `drainQueue` ne les interprète que si les deux correspondent.
 *
 * Ce fichier est la **source unique** du vocabulaire depuis #726 : plus aucun
 * identifiant n'est écrit en littéral, ni dans un contrôleur, ni dans un
 * composant, ni dans les cartes de `ConflictResolutionModal.vue`. Un renommage
 * casse désormais à la compilation plutôt qu'en mer — `drainQueue` rapproche un
 * flash d'une action enfilée par **égalité de chaînes**, et deux littéraux
 * divergents laissent l'action en file sans que rien ne s'affiche.
 *
 * `tests/unit/hygiene/offline_protocol_vocabulary.spec.ts` relit les sources
 * pour vérifier que les deux moitiés se parlent encore, et qu'aucun littéral
 * n'est réapparu.
 */

/** États des lieux (#481, #622). */
export const CREATE_INSPECTION_ACTION = 'create-inspection'
export const UPDATE_INSPECTION_ACTION = 'update-inspection'
export const CREATE_INSPECTION_DEFECT_ACTION = 'create-inspection-defect'

/**
 * Les quatre créations du domaine terrain (#727). Leurs refus métier étaient
 * rendus en `flash('error')` + redirection, sans `rejectedType` : `drainQueue`
 * ne pouvait pas les distinguer d'un succès et **supprimait l'action de la
 * file** — la saisie perdue, sous un toast de synchronisation réussie.
 */
export const CREATE_NAVIGATION_LOG_ACTION = 'create-navigation-log'
export const CREATE_NAVIGATION_LOG_ENTRY_ACTION = 'create-navigation-log-entry'
export const CREATE_FUEL_LOG_ACTION = 'create-fuel-log'
export const INCREMENT_ENGINE_HOURS_ACTION = 'increment-engine-hours'

/**
 * L'édition d'un point de journal (#725) : la seule mutation enfilée hors-ligne
 * qui n'avait aucun verrou optimiste. Elle descend ici pour la même raison —
 * le backend en parle, il renvoie son `conflictType`.
 */
export const UPDATE_NAVIGATION_LOG_ENTRY_ACTION = 'update-navigation-log-entry'

/**
 * Les trois mutations optimistes restées écrites à la main des deux côtés
 * jusqu'à #726 : leur contrôleur renvoie un `conflictType`, leur formulaire
 * enfile le même identifiant, et rien ne rapprochait les deux littéraux.
 */
export const UPDATE_NAVIGATION_LOG_ACTION = 'update-navigation-log'
export const CLOSE_NAVIGATION_LOG_ACTION = 'close-navigation-log'
export const UPDATE_SHEET_ITEM_ACTION = 'update-sheet-item'

/**
 * Les incidents. Ils sont enfilés hors-ligne mais **aucun contrôleur ne renvoie
 * encore leur marqueur** : un refus métier de `BoatIncidentsController` part en
 * `flash('error')` + redirection, que `drainQueue` lit comme un succès (le
 * défaut que #727 a corrigé pour les quatre créations du domaine terrain). Ils
 * vivent ici quand même — le vocabulaire enfilé est clos, et l'exemption
 * correspondante de la garde d'hygiène nomme le trou au lieu de le cacher.
 */
export const CREATE_INCIDENT_ACTION = 'create-incident'
export const UPDATE_INCIDENT_ACTION = 'update-incident'

/**
 * Le vocabulaire complet, dans l'ordre des déclarations ci-dessus. Il ferme
 * l'union `OfflineActionType` : une action enfilée avec un identifiant qui
 * n'est pas ici ne compile pas.
 */
export const OFFLINE_ACTION_TYPES = [
  CREATE_INSPECTION_ACTION,
  UPDATE_INSPECTION_ACTION,
  CREATE_INSPECTION_DEFECT_ACTION,
  CREATE_NAVIGATION_LOG_ACTION,
  CREATE_NAVIGATION_LOG_ENTRY_ACTION,
  CREATE_FUEL_LOG_ACTION,
  INCREMENT_ENGINE_HOURS_ACTION,
  UPDATE_NAVIGATION_LOG_ENTRY_ACTION,
  UPDATE_NAVIGATION_LOG_ACTION,
  CLOSE_NAVIGATION_LOG_ACTION,
  UPDATE_SHEET_ITEM_ACTION,
  CREATE_INCIDENT_ACTION,
  UPDATE_INCIDENT_ACTION,
] as const

/** Union fermée des identifiants d'actions de la file hors-ligne (#726). */
export type OfflineActionType = (typeof OFFLINE_ACTION_TYPES)[number]
