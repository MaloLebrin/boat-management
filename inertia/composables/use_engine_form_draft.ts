import type { Ref } from 'vue'
import {
  catalogFormSurfaceParam,
  useCatalogFormDraft,
  type CatalogDraftFamily,
} from '~/composables/use_catalog_form_draft'

/** Famille catalogue des moteurs (#573), posée sur `useCatalogFormDraft`. */
const ENGINE_DRAFT: CatalogDraftFamily = {
  rememberPrefix: 'boat-engine-form',
  brandParam: 'engineBrandId',
  surfaceParam: 'engineForm',
}

/** Brouillon du formulaire moteur — contrat et raisons : `useCatalogFormDraft`. */
export function useEngineFormDraft(
  key: string,
  fields: Record<string, Ref<string>>,
  syncFromServer: () => void
): void {
  useCatalogFormDraft(ENGINE_DRAFT, key, fields, syncFromServer)
}

/** La modale d'origine se reconnaît dans l'URL et se rouvre après le remontage. */
export function shouldReopenEngineForm(surface: string): boolean {
  return catalogFormSurfaceParam(ENGINE_DRAFT) === surface
}
