/**
 * Pastille de statut d'un équipement moteur — même correspondance que les
 * cartes de la fiche bateau (`BoatShowEnginesCard`), extraite pour que
 * l'inventaire transverse (#598) ne la duplique pas une nouvelle fois.
 */
export function engineStatusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}
