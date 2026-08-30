import { useRemember } from '@inertiajs/vue3'
import { watch, type Ref } from 'vue'

/**
 * Conserve la saisie en cours du formulaire d'équipement générique le temps de
 * l'aller-retour catalogue (#577) — décalque de `useEngineFormDraft` (#573).
 *
 * Le chargement des modèles d'une marque passe par une visite Inertia partielle
 * (`router.reload({ only: ['equipmentCatalogModels'] })`), et cette visite
 * **remonte l'arbre de composants**. Sans ce garde-fou, tous les champs
 * repartiraient de leur valeur serveur au moment précis où l'utilisateur
 * retient une marque.
 *
 * `useRemember` range l'état dans l'historique Inertia, le seul endroit qui
 * survive au remontage, et il est neutre côté SSR.
 *
 * @param key      Identifiant du brouillon — un par équipement édité.
 * @param fields   Champs du formulaire, tous en `string` (formulaire HTML natif).
 * @param syncFromServer Repart des valeurs serveur, hors aller-retour catalogue.
 */
export function useGenericEquipmentFormDraft(
  key: string,
  fields: Record<string, Ref<string>>,
  syncFromServer: () => void
): void {
  const draft = useRemember(
    { touched: false, values: {} as Record<string, string> },
    `boat-generic-equipment-form:${key}`
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
  return searchParam('equipmentBrandId') !== null
}

/**
 * La modale d'où est parti l'aller-retour catalogue doit se rouvrir après le
 * remontage : l'URL est le seul état qui traverse.
 */
export function shouldReopenGenericEquipmentForm(surface: string): boolean {
  return searchParam('equipmentForm') === surface
}

/** Surface brute de l'URL — pour les surfaces paramétrées (`…-edit-<id>`). */
export function genericEquipmentFormSurfaceParam(): string | null {
  return searchParam('equipmentForm')
}

function searchParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}
