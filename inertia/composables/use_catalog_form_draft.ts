import { useRemember } from '@inertiajs/vue3'
import { watch, type Ref } from 'vue'

/** Saisie rangée dans l'historique Inertia : les valeurs, et si l'on y a touché. */
interface CatalogFormDraft {
  touched: boolean
  values: Record<string, string>
}

/**
 * Ce qui distingue deux brouillons de formulaire catalogue : l'espace de noms
 * du brouillon et les deux paramètres que le formulaire pose dans l'URL. Tout
 * le reste est commun (vague 3.5).
 */
export interface CatalogDraftFamily {
  /** Préfixe de la clé `useRemember` — un espace de noms par famille. */
  rememberPrefix: string
  /** Paramètre d'URL qui signe l'aller-retour catalogue de cette famille. */
  brandParam: string
  /** Paramètre d'URL qui transporte la surface d'origine (modale à rouvrir). */
  surfaceParam: string
}

/**
 * Conserve la saisie en cours d'un formulaire le temps de l'aller-retour
 * catalogue — moteur (#573) et équipement générique (#577).
 *
 * Le chargement des modèles d'une marque passe par une visite Inertia
 * partielle (`router.reload({ only: [...] })`), et cette visite **remonte
 * l'arbre de composants**. Sans ce garde-fou, tous les champs repartiraient de
 * leur valeur serveur au moment précis où l'utilisateur retient une marque —
 * y compris celle qu'il vient de choisir, ce qui rendrait la combobox
 * inopérante.
 *
 * `useRemember` range l'état dans l'historique Inertia, le seul endroit qui
 * survive au remontage, et il est neutre côté SSR : `router.restore()` et
 * `router.remember()` sortent immédiatement hors navigateur.
 *
 * @param family         Espace de noms et paramètres d'URL de la famille.
 * @param key            Identifiant du brouillon — un par entité éditée.
 * @param fields         Champs du formulaire, tous en `string` (formulaire HTML natif).
 * @param syncFromServer Repart des valeurs serveur, hors aller-retour catalogue.
 */
export function useCatalogFormDraft(
  family: CatalogDraftFamily,
  key: string,
  fields: Record<string, Ref<string>>,
  syncFromServer: () => void
): void {
  /**
   * `useRemember` se déclare `T | Ref<T>` (son repli SSR), mais rend toujours
   * un `Ref` — le cast rend explicite ce que le code supposait déjà, et retire
   * les six erreurs vue-tsc que les deux brouillons portaient chacun.
   */
  const draft = useRemember<CatalogFormDraft>(
    { touched: false, values: {} },
    `${family.rememberPrefix}:${key}`
  ) as Ref<CatalogFormDraft>

  if (draft.value.touched && searchParam(family.brandParam) !== null) {
    for (const [name, field] of Object.entries(fields)) {
      field.value = draft.value.values[name] ?? field.value
    }
  } else {
    syncFromServer()
  }

  watch(Object.values(fields), () => {
    draft.value = {
      touched: true,
      values: Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, field.value])
      ),
    }
  })
}

/**
 * Surface d'où part l'aller-retour catalogue, pour les écrans qui montent le
 * formulaire dans une **modale**.
 *
 * Le remontage emporte aussi le booléen d'ouverture de la modale, qui n'est
 * qu'un `ref` local : elle se refermerait donc au moment où l'utilisateur
 * retient une marque. L'URL est le seul état qui traverse la visite — le
 * formulaire y inscrit sa surface d'origine, la modale s'y reconnaît et se
 * rouvre. Rendue brute, pour les surfaces paramétrées (`…-edit-<id>`).
 */
export function catalogFormSurfaceParam(family: CatalogDraftFamily): string | null {
  return searchParam(family.surfaceParam)
}

function searchParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}
