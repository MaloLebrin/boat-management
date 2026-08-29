import { computed } from 'vue'
import { COUNTRY_CODES } from '../../shared/constants/countries'
import { resolveLocaleTag } from '../../shared/helpers/date_format'
import { countryName as renderCountryName } from '../../shared/helpers/countries'
import { useT } from './use_t'

/** Nombre de pavillons maritimes épinglés en tête de `COUNTRY_CODES` (#580). */
const PINNED_COUNT = 11

/**
 * Pays pour les écrans Inertia (#580).
 *
 * Même contrat que `useDateFormat()` : le composable lie la locale réactive de
 * l'app une fois pour toutes, pour qu'aucun composant n'ait à passer — ni à
 * oublier — la locale, et donc à retomber sur celle du navigateur.
 */
export function useCountries() {
  const { locale } = useT()

  /**
   * Les pavillons courants gardent leur ordre en tête ; le reste est trié sur
   * le **libellé traduit**, pas sur le code : une liste ordonnée sur `DE`, `GB`,
   * `NL` n'a aucun sens pour un utilisateur qui lit « Allemagne », « Pays-Bas »,
   * « Royaume-Uni ».
   */
  const countryOptions = computed(() => {
    const tag = resolveLocaleTag(locale.value)
    const toOption = (code: string) => ({ value: code, label: renderCountryName(code, tag) })

    const pinned = COUNTRY_CODES.slice(0, PINNED_COUNT).map(toOption)
    const collator = new Intl.Collator(tag)
    const rest = COUNTRY_CODES.slice(PINNED_COUNT)
      .map(toOption)
      .sort((a, b) => collator.compare(a.label, b.label))

    return [...pinned, ...rest]
  })

  return {
    countryOptions,
    /** Nom du pays dans la locale de l'app, repli sur la valeur brute (#580). */
    countryName: (code: string | null | undefined) => renderCountryName(code, locale.value),
  }
}
