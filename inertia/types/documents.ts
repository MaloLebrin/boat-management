/**
 * Libellés déjà traduits reçus par les composants génériques de documents
 * (vague 3.1). Chaque domaine garde son vocabulaire (« Légende » pour un
 * bateau, « Libellé » pour un client) : il traduit ses propres clés et les
 * passe ici plutôt que d'imposer un namespace commun.
 */
export interface DocumentModalLabels {
  dropzone: string
  formats: string
  browse: string
  selectedFiles: string
  caption: string
  upload: string
  uploading: string
}

export interface DocumentListLabels {
  /** Intitulé de la liste (ex. « Documents »). */
  title: string
  /** Bouton d'ajout (tel qu'affiché : le domaine décide du « + »). */
  add: string
  empty: string
  formats: string
  delete: string
  /** Title de l'ancre de téléchargement ; omis = pas d'attribut. */
  download?: string
}

/** Confirmation avant suppression : absente = suppression directe par formulaire. */
export interface DocumentDeleteConfirm {
  title: string
  message: string
  confirmLabel: string
}
