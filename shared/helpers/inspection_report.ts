import { inspectionSectionsForCategory } from '#shared/helpers/inspection_checklist'
import type { BoatCategory } from '#shared/types/boat_catalog'
import type {
  InspectionItemState,
  InspectionReportChange,
  InspectionReportSection,
  InspectionReportTally,
} from '#shared/types/inspection'

/**
 * Contenu d'un état des lieux imprimé (#889) : la checklist applicable au
 * bateau, chaque point avec son constat, et au retour les écarts avec le
 * départ. Pur — le service PDF ne fait que le mettre en page.
 */

interface ItemRecord {
  itemKey: string
  state: InspectionItemState
  note: string | null
}

const STATE_RANK: Record<InspectionItemState, number> = { ok: 0, remark: 1, damage: 2 }

/** Un point est dégradé quand son constat au retour est plus grave qu'au départ. */
export function isInspectionItemDegraded(
  before: InspectionItemState | null,
  after: InspectionItemState | null
): boolean {
  if (!before || !after) return false
  return STATE_RANK[after] > STATE_RANK[before]
}

/**
 * Sections applicables à la catégorie, chaque point rapproché de son constat.
 * Un constat dont la clé n'est plus applicable (catégorie changée depuis) est
 * ajouté à la fin de sa section plutôt que perdu : il a été constaté.
 */
export function inspectionReportSections(
  category: BoatCategory | null,
  items: readonly ItemRecord[]
): InspectionReportSection[] {
  const byKey = new Map(items.map((item) => [item.itemKey, item]))
  const allSections = inspectionSectionsForCategory(null)

  return inspectionSectionsForCategory(category)
    .map((section) => {
      const applicable = new Set(section.items.map((entry) => entry.key))
      const orphans =
        allSections
          .find((candidate) => candidate.key === section.key)
          ?.items.filter((entry) => !applicable.has(entry.key) && byKey.has(entry.key)) ?? []

      return {
        key: section.key,
        titleKey: section.titleKey,
        rows: [...section.items, ...orphans].map((entry) => {
          const record = byKey.get(entry.key)
          return {
            itemKey: entry.key,
            labelKey: entry.labelKey,
            state: record?.state ?? null,
            note: record?.note ?? null,
          }
        }),
      }
    })
    .filter((section) => section.rows.length > 0)
}

/** Nombre de points par constat, non contrôlés compris. */
export function inspectionReportTally(
  sections: readonly InspectionReportSection[]
): InspectionReportTally {
  const tally: InspectionReportTally = { ok: 0, remark: 0, damage: 0, notInspected: 0 }
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.state) tally[row.state] += 1
      else tally.notInspected += 1
    }
  }
  return tally
}

/**
 * Points dont le constat diffère entre départ et retour, dans l'ordre de la
 * checklist. La note retenue est celle du retour — c'est elle qui décrit
 * l'écart.
 */
export function inspectionReportChanges(
  checkoutSections: readonly InspectionReportSection[],
  checkinSections: readonly InspectionReportSection[]
): InspectionReportChange[] {
  const before = new Map(
    checkoutSections.flatMap((section) => section.rows.map((row) => [row.itemKey, row] as const))
  )

  return checkinSections.flatMap((section) =>
    section.rows
      .filter((row) => (before.get(row.itemKey)?.state ?? null) !== row.state)
      .map((row) => {
        const previous = before.get(row.itemKey)?.state ?? null
        return {
          itemKey: row.itemKey,
          labelKey: row.labelKey,
          before: previous,
          after: row.state,
          note: row.note,
          degraded: isInspectionItemDegraded(previous, row.state),
        }
      })
  )
}
