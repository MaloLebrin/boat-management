/**
 * Valeur d'un en-tête `Content-Disposition` pour un téléchargement.
 *
 * Quatre contrôleurs portaient chacun leur copie de cette fonction, et huit
 * autres endpoints écrivaient `attachment; filename="${filename}"` à la main.
 * Un seul helper : les caractères de contrôle (CR, LF, NUL…), les guillemets
 * et l'antislash sont neutralisés dans le paramètre `filename` (pas de
 * *header splitting*), et le nom complet — accents compris — est transmis
 * encodé dans `filename*` (RFC 6266 / 5987), que les navigateurs préfèrent.
 */
export interface ContentDispositionOptions {
  /** `inline` (affichage dans le navigateur) plutôt que `attachment`. */
  inline?: boolean
}

export function contentDisposition(
  filename: string,
  options: ContentDispositionOptions = {}
): string {
  const type = options.inline ? 'inline' : 'attachment'
  // eslint-disable-next-line no-control-regex
  const ascii = filename.replace(/[\x00-\x1f\x7f"\\]/g, '_')
  const encoded = encodeURIComponent(filename)
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}
