import {
  DIAGNOSTIC_SHEETS,
  GLOBAL_CHECKLISTS,
} from '#shared/constants/diagnostic/diagnostic_content'
import { resolveEngineFamily, type EngineFamilySignals } from '#shared/helpers/engine_family'
import type {
  DiagnosticGlobalChecklist,
  DiagnosticSection,
  DiagnosticSheet,
  DiagnosticSheetSlug,
} from '#shared/types/diagnostic'
import type { EngineFamily } from '#shared/types/engine_catalog'

/**
 * Éligibilité au diagnostic de panne (#515, #516), **par famille de
 * motorisation** depuis #576.
 *
 * Remplace le `kind === 'outboard' && strokeType === '2_stroke'` codé en dur :
 * il était justifié tant que le corpus se limitait au 2 temps, il ne l'est plus
 * une fois les fiches in-bord diesel livrées — et il créait l'incohérence d'un
 * moteur qui a droit aux pièces détachées (#574) mais pas au diagnostic, alors
 * que c'est la famille où l'immobilisation coûte le plus cher.
 *
 * Même mécanique que `isSparePartsEligibleEngine()` : c'est le **contenu** qui
 * décide. Une famille sans fiche déclarée reste non éligible, sans rien à coder
 * ailleurs ; ajouter des fiches à une famille l'ouvre automatiquement.
 */

/** Signature minimale d'un moteur pour la résolution de famille. */
export type DiagnosticEngine = EngineFamilySignals & { family?: string | null }

/**
 * Fiches servies à une famille. Les fiches `standalone` (« premier contact »,
 * achat d'occasion) en sont exclues : elles ne se rattachent à aucun moteur en
 * base, et compter dessus rendrait éligible n'importe quelle motorisation.
 */
export function sheetsForEngineFamily(family: EngineFamily | null): readonly DiagnosticSheet[] {
  if (!family) return []
  return Object.values(DIAGNOSTIC_SHEETS).filter(
    (sheet) => !sheet.standalone && sheet.families.includes(family)
  )
}

/** Fiches servies à un moteur, famille résolue comprise. */
export function sheetsForEngine(engine: DiagnosticEngine): readonly DiagnosticSheet[] {
  return sheetsForEngineFamily(resolveEngineFamily(engine))
}

/**
 * Un moteur est éligible au diagnostic dès qu'au moins une fiche concerne sa
 * famille — exactement le critère des pièces détachées (#574).
 */
export function isDiagnosticEligibleEngine(engine: DiagnosticEngine): boolean {
  return sheetsForEngine(engine).length > 0
}

/** La fiche demandée s'applique-t-elle bien à ce moteur ? (URL forgée, lien croisé) */
export function isSheetForEngine(engine: DiagnosticEngine, slug: DiagnosticSheetSlug): boolean {
  return sheetsForEngine(engine).some((sheet) => sheet.slug === slug)
}

/**
 * Checklist globale d'une famille, ou `null` si aucune ne la sert. Les familles
 * sont disjointes d'une checklist à l'autre : un moteur n'en a jamais deux.
 */
export function globalChecklistForFamily(
  family: EngineFamily | null
): DiagnosticGlobalChecklist | null {
  if (!family) return null
  return GLOBAL_CHECKLISTS.find((checklist) => checklist.families.includes(family)) ?? null
}

/** Checklist globale d'un moteur, famille résolue comprise. */
export function globalChecklistForEngine(
  engine: DiagnosticEngine
): DiagnosticGlobalChecklist | null {
  return globalChecklistForFamily(resolveEngineFamily(engine))
}

/**
 * Sections d'une fiche retenues pour une famille — les fiches **élargies**
 * (`electrical`) portent des sections restreintes plutôt qu'une fiche dupliquée
 * par famille. Une section sans `families` vaut pour toute la fiche.
 *
 * Sans famille résolue on rend la fiche entière : mieux vaut trop d'étapes
 * qu'un écran vide pour qui n'a pas renseigné sa motorisation.
 */
export function sectionsForFamily(
  sheet: DiagnosticSheet,
  family: EngineFamily | null
): readonly DiagnosticSection[] {
  if (!family) return sheet.sections
  return sheet.sections.filter((section) => !section.families || section.families.includes(family))
}
