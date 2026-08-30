import { INSPECTION_CHECKLIST_SECTIONS } from '#shared/constants/inspections/inspection_checklist_content'
import { deriveCategoryFromLegacy } from '#shared/helpers/boat_catalog'
import { isBoatCategory, type BoatCategory } from '#shared/types/boat_catalog'
import type { InspectionChecklistSection } from '#shared/types/inspection'

/**
 * Helpers purs de la checklist d'état des lieux (#584) — partagés backend
 * (props Inertia, docs) et frontend (rendu, filtrage), comme
 * `shared/helpers/diagnostic.ts`.
 */

/**
 * Catégorie effective d'un bateau pour la checklist : `boats.category` (#571)
 * quand elle est renseignée, sinon repli best-effort sur les colonnes
 * historiques (`type`, `propulsion_type`). `null` quand rien ne permet de
 * trancher — la checklist s'affiche alors en entier.
 */
export function inspectionCategoryForBoat(boat: {
  category: string | null
  type: string | null
  propulsionType: string | null
}): BoatCategory | null {
  if (isBoatCategory(boat.category)) return boat.category
  return deriveCategoryFromLegacy(boat.type, boat.propulsionType)
}

function appliesTo(
  categories: readonly BoatCategory[] | undefined,
  category: BoatCategory | null
): boolean {
  if (!categories) return true
  // Catégorie inconnue : on montre tout plutôt que de cacher des points de
  // contrôle — cocher « OK » un item sans objet ne coûte qu'un tap.
  if (category === null) return true
  return categories.includes(category)
}

/**
 * Sections de la checklist applicables à une catégorie de bateau, items
 * filtrés item par item. Une section dont tous les items sont écartés
 * disparaît entièrement.
 */
export function inspectionSectionsForCategory(
  category: BoatCategory | null
): readonly InspectionChecklistSection[] {
  return INSPECTION_CHECKLIST_SECTIONS.filter((section) => appliesTo(section.categories, category))
    .map((section) => ({
      ...section,
      items: section.items.filter((entry) => appliesTo(entry.categories, category)),
    }))
    .filter((section) => section.items.length > 0)
}

/** Nombre total d'items applicables à une catégorie — pour la progression. */
export function inspectionItemCountForCategory(category: BoatCategory | null): number {
  return inspectionSectionsForCategory(category).reduce(
    (total, section) => total + section.items.length,
    0
  )
}

/** Retrouve un item du corpus par sa clé persistée — libellé d'une action pré-remplie. */
export function findInspectionChecklistItem(itemKey: string) {
  for (const section of INSPECTION_CHECKLIST_SECTIONS) {
    const found = section.items.find((entry) => entry.key === itemKey)
    if (found) return found
  }
  return null
}
