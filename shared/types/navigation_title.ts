/**
 * Vocabulaire unique des titres de navigation (#585).
 *
 * Une seule liste sert les deux domaines qui parlaient chacun le leur :
 * les certifications d'équipage (`crew_certifications.type`) et les permis
 * des clients (`clients.navigation_permit_type`). Toute valeur ajoutée ici
 * devient donc disponible des deux côtés — ne jamais dupliquer la liste.
 *
 * `coastal_permit`, `offshore_permit`, `vhf`, `stcw_basic`,
 * `stcw_proficiency` et `other` étaient déjà en base côté certifications :
 * leur orthographe est figée, aucune ligne existante ne doit devenir invalide.
 */
export const NAVIGATION_TITLES = [
  'coastal_permit',
  'offshore_permit',
  'inland_permit',
  'captain_200',
  'vhf',
  'crr',
  'stcw_basic',
  'stcw_proficiency',
  'medical_certificate',
  'first_aid',
  'other',
] as const

export type NavigationTitle = (typeof NAVIGATION_TITLES)[number]
