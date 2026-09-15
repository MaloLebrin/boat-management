/**
 * Une entrée de navigation est active quand l'URL courante est son chemin ou
 * l'un de ses sous-chemins, comparés par segment : `/boats/1/engines/2` active
 * `/boats` mais pas `/engines` (sinon deux entrées s'allument ensemble), et
 * `/boatsX` n'active pas `/boats`.
 */
export function isNavPathActive(currentUrl: string, path: string): boolean {
  return (
    currentUrl === path ||
    currentUrl.startsWith(`${path}/`) ||
    currentUrl.startsWith(`${path}?`) ||
    currentUrl.startsWith(`${path}#`)
  )
}
