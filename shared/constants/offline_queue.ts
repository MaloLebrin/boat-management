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
