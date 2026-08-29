import { BOAT_CATEGORY_OPTIONS } from '../../shared/constants/boats/boat_form_options'

/**
 * Libellé traduit d'une catégorie de bateau (#571).
 *
 * Repli sur la valeur brute pour une catégorie inconnue, plutôt que d'afficher
 * une clé i18n : la colonne reste lisible si le vocabulaire évolue.
 *
 * Rien à voir avec `boats.options.navigationCategory` (catégorie CE A/B/C/D).
 */
export function boatCategoryLabel(
  t: (key: string) => string,
  value: string | null | undefined
): string | null {
  if (!value) return null
  const isKnown = BOAT_CATEGORY_OPTIONS.some((option) => option.value === value)
  return isKnown ? t(`boats.options.category.${value}`) : value
}
