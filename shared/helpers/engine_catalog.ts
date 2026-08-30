import { normalizeCatalogText } from '#shared/helpers/boat_catalog'

/**
 * Helpers purs du catalogue moteur (#573) — partagés par le service, le seeder
 * et les tests.
 *
 * `slugifyCatalogName()` et `normalizeCatalogText()` sont ceux du catalogue de
 * bateaux (`#shared/helpers/boat_catalog`) : les règles de slug et de
 * rapprochement sont exactement les mêmes, il n'y a pas lieu de les dupliquer.
 */

/**
 * Découpe une saisie libre en mots normalisés. Le découpage se fait sur les
 * caractères non alphanumériques **avant** normalisation, pour que
 * `Volvo Penta D2-40` donne `['volvo', 'penta', 'd2', '40']` et non un seul
 * bloc — c'est ce qui donne des frontières de mot fiables.
 */
export function catalogTokens(value: string): string[] {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => normalizeCatalogText(token))
    .filter(Boolean)
}

/**
 * Groupes de mots consécutifs d'une saisie libre, du plus long au plus court
 * (`Volvo Penta D2-40` → `volvopentad240`, `volvopentad2`, `volvopenta`, …).
 *
 * C'est ce qui permet de retrouver une marque **noyée dans une saisie plus
 * large** (`EVINRUDE 6cv`, `Mercury MerCruiser 5.7`) là où l'égalité stricte du
 * catalogue de bateaux échouerait. Le découpage en mots évite les faux positifs
 * d'un `includes` brut, qui rattacherait un slug court comme `omc` ou `mase` au
 * milieu de n'importe quel mot.
 *
 * L'ordre décroissant fait gagner la correspondance la plus spécifique :
 * `Mercury MerCruiser` doit tomber sur `mercruiser`, pas sur `mercury-mariner`.
 */
export function catalogTokenNgrams(value: string): string[] {
  const tokens = catalogTokens(value)
  const ngrams: string[] = []

  for (let size = tokens.length; size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      ngrams.push(tokens.slice(start, start + size).join(''))
    }
  }

  // Deux fenêtres différentes peuvent produire la même chaîne ; le tri
  // secondaire par longueur garde l'ordre « du plus spécifique au plus large »
  // même quand les mots sont de tailles très inégales.
  return [...new Set(ngrams)].sort((a, b) => b.length - a.length)
}
