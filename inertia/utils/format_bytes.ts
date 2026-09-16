/**
 * Taille de fichier lisible (o / Ko / Mo), telle qu'affichée dans les listes
 * et modales de documents. Neuf copies locales identiques avant la vague 3.1.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
