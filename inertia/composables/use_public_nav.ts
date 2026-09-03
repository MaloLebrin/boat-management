import { computed, type Ref } from 'vue'
import { marketingPath, type AppLocale } from '#shared/helpers/locale_path'

export interface PublicNavLink {
  /** Clé i18n `public.nav.*` — le libellé est résolu par le composant via `t()`. */
  labelKey: string
  href: string
}

export interface PublicNavGroup {
  labelKey: string
  links: PublicNavLink[]
}

/**
 * Source unique des liens de navigation publique : le dropdown « Produit » du
 * header desktop et le drawer mobile consomment les mêmes groupes, les hrefs
 * viennent de `marketingPath` (jamais d'interpolation de locale, #475).
 */
export function usePublicNav(locale: Ref<AppLocale>) {
  /** Groupes du menu « Produit » : pages fonctionnalité, puis outils gratuits. */
  const productGroups = computed<PublicNavGroup[]>(() => [
    {
      labelKey: 'public.nav.productFeaturesGroup',
      links: [
        { labelKey: 'public.nav.maintenance', href: marketingPath('maintenance', locale.value) },
        { labelKey: 'public.nav.fleet', href: marketingPath('fleet', locale.value) },
        { labelKey: 'public.nav.aiAssistant', href: marketingPath('aiAssistant', locale.value) },
      ],
    },
    {
      labelKey: 'public.nav.productToolsGroup',
      links: [
        { labelKey: 'public.nav.simulator', href: marketingPath('simulator', locale.value) },
        { labelKey: 'public.nav.diagnosisAi', href: marketingPath('diagnosisAi', locale.value) },
        { labelKey: 'public.nav.partsAi', href: marketingPath('partsAi', locale.value) },
      ],
    },
  ])

  /** Liens de premier niveau, à droite du menu « Produit ». */
  const topLinks = computed<PublicNavLink[]>(() => [
    { labelKey: 'public.nav.pricing', href: marketingPath('pricing', locale.value) },
    { labelKey: 'public.nav.guide', href: marketingPath('guide', locale.value) },
    { labelKey: 'public.nav.help', href: marketingPath('help', locale.value) },
  ])

  return { productGroups, topLinks }
}
