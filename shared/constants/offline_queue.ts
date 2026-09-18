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
 * L'édition d'un point de journal (#725) : la seule mutation enfilée hors-ligne
 * qui n'avait aucun verrou optimiste. Elle descend ici parce que le backend en
 * parle désormais — il renvoie son `conflictType`. Le rapatriement des autres
 * identifiants encore écrits en littéral des deux côtés reste l'objet de #726.
 */
export const UPDATE_NAVIGATION_LOG_ENTRY_ACTION = 'update-navigation-log-entry'
