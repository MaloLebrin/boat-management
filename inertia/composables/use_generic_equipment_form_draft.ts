import type { Ref } from 'vue'
import {
  catalogFormSurfaceParam,
  useCatalogFormDraft,
  type CatalogDraftFamily,
} from '~/composables/use_catalog_form_draft'

/** Famille catalogue des équipements génériques (#577), posée sur `useCatalogFormDraft`. */
const GENERIC_EQUIPMENT_DRAFT: CatalogDraftFamily = {
  rememberPrefix: 'boat-generic-equipment-form',
  brandParam: 'equipmentBrandId',
  surfaceParam: 'equipmentForm',
}

/** Brouillon du formulaire d'équipement — contrat et raisons : `useCatalogFormDraft`. */
export function useGenericEquipmentFormDraft(
  key: string,
  fields: Record<string, Ref<string>>,
  syncFromServer: () => void
): void {
  useCatalogFormDraft(GENERIC_EQUIPMENT_DRAFT, key, fields, syncFromServer)
}

/** La modale d'origine se reconnaît dans l'URL et se rouvre après le remontage. */
export function shouldReopenGenericEquipmentForm(surface: string): boolean {
  return catalogFormSurfaceParam(GENERIC_EQUIPMENT_DRAFT) === surface
}

/** Surface brute de l'URL — pour les surfaces paramétrées (`…-edit-<id>`). */
export function genericEquipmentFormSurfaceParam(): string | null {
  return catalogFormSurfaceParam(GENERIC_EQUIPMENT_DRAFT)
}
