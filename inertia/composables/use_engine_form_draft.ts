import { useRemember } from '@inertiajs/vue3'
import { watch, type Ref } from 'vue'

/**
 * Conserve la saisie en cours du formulaire moteur le temps de l'aller-retour
 * catalogue (#573).
 *
 * Le chargement des modèles d'une marque passe par une visite Inertia partielle
 * (`router.reload({ only: ['engineCatalogModels'] })`), et cette visite
 * **remonte l'arbre de composants**. Sans ce garde-fou, tous les champs
 * repartiraient de leur valeur serveur au moment précis où l'utilisateur retient
 * une marque — y compris la marque qu'il vient de choisir, ce qui rendrait la
 * combobox inopérante.
 *
 * `useRemember` range l'état dans l'historique Inertia, le seul endroit qui
 * survive au remontage, et il est neutre côté SSR : `router.restore()` et
 * `router.remember()` sortent immédiatement hors navigateur.
 *
 * @param key      Identifiant du brouillon — un par moteur édité.
 * @param fields   Champs du formulaire, tous en `string` (formulaire HTML natif).
 * @param syncFromServer Repart des valeurs serveur, hors aller-retour catalogue.
 */
export function useEngineFormDraft(
  key: string,
  fields: Record<string, Ref<string>>,
  syncFromServer: () => void
): void {
  const draft = useRemember(
    { touched: false, values: {} as Record<string, string> },
    `boat-engine-form:${key}`
  )

  if (draft.value.touched && isCatalogRoundTrip()) {
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
 * L'aller-retour catalogue se reconnaît au paramètre que le formulaire a
 * lui-même posé dans l'URL. Toute autre arrivée sur l'écran — première
 * ouverture, réouverture de la modale après un enregistrement — repart des
 * valeurs serveur, pour ne jamais ressusciter un brouillon abandonné.
 */
function isCatalogRoundTrip(): boolean {
  return searchParam('engineBrandId') !== null
}

/**
 * Surface d'où part l'aller-retour catalogue, pour les écrans qui montent le
 * formulaire moteur dans une **modale** (`BoatShowEnginesCard`,
 * `BoatEquipmentAddModal`).
 *
 * Le remontage emporte aussi le booléen d'ouverture de la modale, qui n'est
 * qu'un `ref` local : elle se refermerait donc au moment où l'utilisateur
 * retient une marque. L'URL est le seul état qui traverse la visite — le
 * formulaire y inscrit sa surface d'origine, la modale s'y reconnaît et se
 * rouvre.
 */
export function shouldReopenEngineForm(surface: string): boolean {
  return searchParam('engineForm') === surface
}

function searchParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URL(window.location.href).searchParams.get(name)
}
