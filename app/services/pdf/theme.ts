/**
 * Thème commun des PDF FleetAi (vague 2.3) : palette et géométrie A4
 * partagées par les cinq générateurs (facture, contrat de location,
 * historique et carnet d'entretien, rôle d'équipage). Une couleur ne se
 * redéclare plus dans un service : elle vient d'ici.
 */
export const PDF_COLORS = {
  navy: '#0b1d2e',
  coral: '#e2674f',
  greyB: '#e0e0e0',
  greyM: '#888888',
  greyD: '#333333',
  white: '#ffffff',
  /** Fond des lignes paires d'un tableau. */
  rowAlt: '#f8f8f8',
  /** Bandeau d'en-tête quand l'organisation n'a pas de couleur de marque. */
  defaultPrimary: '#1e3a5f',
} as const

/** Page A4 en points PostScript, marges et largeur utile. */
export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  contentWidth: 595.28 - 48 * 2,
} as const
