import { computed } from 'vue'
import { CLIENT_PERMIT_TYPES } from '#shared/types/client'
import { NAVIGATION_TITLES } from '#shared/types/navigation_title'
import { useT } from './use_t'

/**
 * Libellés et listes d'options du vocabulaire partagé des titres de navigation
 * (#585) : une seule source pour les certifications d'équipage et les permis
 * des clients.
 */
export function useNavigationTitles() {
  const { t } = useT()

  /** Libellé d'un titre, y compris une valeur historique côté client. */
  function navigationTitleLabel(value: string | null | undefined): string {
    if (!value) return ''
    return t(`common.navigationTitles.${value}`)
  }

  /** Options du select des certifications d'équipage. */
  const certificationTypeOptions = computed(() =>
    NAVIGATION_TITLES.map((value) => ({ value, label: navigationTitleLabel(value) }))
  )

  /**
   * Options du select des permis clients : le vocabulaire partagé plus
   * « aucun permis ».
   *
   * Une fiche saisie avant #585 porte une valeur historique (`coastal`…) qui
   * n'est plus proposée : elle est réinjectée en tête pour rester sélectionnée
   * — sans quoi le select s'ouvrirait vide et l'enregistrement effacerait le
   * permis du client.
   */
  function clientPermitTypeOptions(current?: string | null) {
    const options = CLIENT_PERMIT_TYPES.map((value) => ({
      value: value as string,
      label: navigationTitleLabel(value),
    }))

    if (current && !options.some((option) => option.value === current)) {
      options.unshift({ value: current, label: navigationTitleLabel(current) })
    }

    return options
  }

  return { navigationTitleLabel, certificationTypeOptions, clientPermitTypeOptions }
}
