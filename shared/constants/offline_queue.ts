/**
 * Identifiants des actions de la file hors-ligne (#481). Partagés backend ↔
 * frontend : le composant les pose à l'`enqueue`, le contrôleur les renvoie
 * dans les flashs `rejectedType`, `conflictType` et `createdResourceType`, et
 * `drainQueue` ne les interprète que si les deux correspondent.
 *
 * Les autres types (sorties, incidents, fiches d'entretien…) n'ont pas encore
 * de constante : seuls ceux dont le backend parle vivent ici.
 */
export const CREATE_INSPECTION_ACTION = 'create-inspection'
export const UPDATE_INSPECTION_ACTION = 'update-inspection'
export const CREATE_INSPECTION_DEFECT_ACTION = 'create-inspection-defect'

/**
 * Les quatre créations du domaine terrain (#727). Leurs refus métier étaient
 * rendus en `flash('error')` + redirection, sans `rejectedType` : `drainQueue`
 * ne pouvait pas les distinguer d'un succès et **supprimait l'action de la
 * file** — la saisie perdue, sous un toast de synchronisation réussie.
 *
 * Elles descendent ici parce que le backend en parle désormais ; le
 * rapatriement des identifiants encore écrits en littéral des deux côtés
 * (`update-navigation-log`, `close-navigation-log`, `update-sheet-item`…) reste
 * l'objet de #726.
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
