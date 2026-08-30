import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import {
  ALL_DIAGNOSTIC_STEP_KEYS,
  DIAGNOSTIC_SHEETS,
  GLOBAL_CHECKLIST,
  GLOBAL_CHECKLISTS,
} from '../../shared/constants/diagnostic/diagnostic_content'
import {
  globalChecklistForFamily,
  isDiagnosticEligibleEngine,
  isSheetForEngine,
  sectionsForFamily,
  sheetsForEngineFamily,
} from '../../shared/helpers/diagnostic'
import {
  DIAGNOSTIC_GLOBAL_SCOPES,
  DIAGNOSTIC_RESET_SCOPES,
  DIAGNOSTIC_SHEET_SLUGS,
} from '../../shared/types/diagnostic'
import { ENGINE_FAMILIES, type EngineFamily } from '../../shared/types/engine_catalog'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeKeys(locale: 'en' | 'fr'): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, 'diagnostic.json'))
  return new Set(flattenKeys(JSON.parse(raw.toString()), 'diagnostic'))
}

/**
 * Toutes les clés d'étapes du corpus tel qu'il était avant #576 — relevées sur
 * `shared/constants/diagnostic/diagnostic_content.ts` à la version précédente,
 * fiche autonome « premier contact » comprise.
 *
 * Elles sont persistées dans `boat_engine_diagnostic_checks.step_key` : en
 * renommer une décocherait silencieusement les checklists de tous les
 * utilisateurs. Ce test est le garde-fou de ce critère de l'issue.
 */
const LEGACY_STEP_KEYS = [
  'compression.all_cylinders',
  'compression.model_spec',
  'compression.retest_after_head',
  'compression.retest_after_run',
  'compression.spread_calculated',
  'cooling.drill_test',
  'cooling.impeller',
  'cooling.ir_thermometer',
  'cooling.telltale_nipple',
  'cooling.thermostat',
  'cooling.water_jackets',
  'cooling.water_tube',
  'electrical.battery',
  'electrical.connections',
  'electrical.runaway_starter',
  'electrical.solenoid_jump',
  'electrical.solenoid_welded',
  'electrical.trim_wiring',
  'first-contact.compression',
  'first-contact.external_tank',
  'first-contact.flywheel',
  'first-contact.gear_oil',
  'first-contact.gearshift',
  'first-contact.primer_bulb',
  'first-contact.spark',
  'first-contact.start_listen',
  'fuel.air_leaks',
  'fuel.black_hose_only',
  'fuel.blow_test',
  'fuel.carb_cleaner',
  'fuel.carb_disassembly',
  'fuel.carb_photos',
  'fuel.carb_removal',
  'fuel.cork_float',
  'fuel.filter_direction',
  'fuel.float_level',
  'fuel.fresh_fuel',
  'fuel.mixture_screw_count',
  'fuel.primer_bulb',
  'fuel.pump_replace',
  'fuel.pump_test',
  'fuel.reassembly',
  'fuel.reed_backfire',
  'fuel.reed_backlight',
  'fuel.tank_vent',
  'gearcase.corroded_gearcase',
  'gearcase.gear_oil',
  'gearcase.grease_splines',
  'gearcase.shear_pin',
  'gearcase.shift_linkage',
  'gearcase.spun_hub',
  'global.compression',
  'global.flywheel',
  'global.fresh_fuel',
  'global.fuel_system',
  'global.gear_oil',
  'global.gearshift',
  'global.kill_switch',
  'global.spark',
  'global.tank_vent',
  'global.tell_tale',
  'global.timing',
  'ignition.cdi_measures',
  'ignition.coils',
  'ignition.cranking_rpm',
  'ignition.grounds',
  'ignition.kill_circuit',
  'ignition.model_id',
  'ignition.plugs',
  'ignition.rectifier',
  'timing.cable_preload',
  'timing.cam_roller',
  'timing.fast_start_modules',
  'timing.idle_rpm',
  'timing.max_advance',
  'timing.pickup_timing',
  'timing.sea_trial',
  'timing.shop_manual',
  'timing.tdc_pointer',
  'timing.throttle_cable',
  'timing.warm_mixture',
  'timing.wot_stop',
]

describe('Contenu diagnostic (#515, #576)', () => {
  test('chaque fiche déclare au moins une famille de motorisation connue', () => {
    for (const sheet of Object.values(DIAGNOSTIC_SHEETS)) {
      expect(sheet.families.length, `familles manquantes sur ${sheet.slug}`).toBeGreaterThan(0)
      for (const family of sheet.families) {
        expect(ENGINE_FAMILIES, `famille inconnue sur ${sheet.slug}`).toContain(family)
      }
    }
  })

  test('chaque slug de fiche a une entrée dans le catalogue, et réciproquement', () => {
    expect(Object.keys(DIAGNOSTIC_SHEETS).sort()).toEqual([...DIAGNOSTIC_SHEET_SLUGS].sort())
    for (const [slug, sheet] of Object.entries(DIAGNOSTIC_SHEETS)) {
      expect(sheet.slug, `le slug de ${slug} ne correspond pas à sa clé`).toBe(slug)
    }
  })

  test('toute clé d’étape est préfixée par le scope de sa fiche ou de sa checklist', () => {
    for (const checklist of GLOBAL_CHECKLISTS) {
      for (const step of checklist.steps) {
        expect(step.key.startsWith(`${checklist.scope}.`), `clé hors scope : ${step.key}`).toBe(
          true
        )
      }
    }
    for (const sheet of Object.values(DIAGNOSTIC_SHEETS)) {
      for (const section of sheet.sections) {
        for (const step of section.steps) {
          expect(step.key.startsWith(`${sheet.slug}.`), `clé hors scope : ${step.key}`).toBe(true)
        }
      }
    }
  })

  test('aucune clé d’étape en double dans tout le corpus', () => {
    const keys = [
      ...GLOBAL_CHECKLISTS.flatMap((checklist) => checklist.steps),
      ...Object.values(DIAGNOSTIC_SHEETS).flatMap((sheet) =>
        sheet.sections.flatMap((section) => [...section.steps])
      ),
    ].map((step) => step.key)

    expect(new Set(keys).size, 'clés dupliquées dans le corpus').toBe(keys.length)
  })

  test('les clés d’étapes d’avant #576 existent toujours à l’identique', () => {
    const corpus = new Set(
      [
        ...GLOBAL_CHECKLISTS.flatMap((checklist) => checklist.steps),
        ...Object.values(DIAGNOSTIC_SHEETS).flatMap((sheet) =>
          sheet.sections.flatMap((section) => [...section.steps])
        ),
      ].map((step) => step.key)
    )

    for (const key of LEGACY_STEP_KEYS) {
      expect(corpus.has(key), `clé disparue ou renommée : ${key}`).toBe(true)
    }
  })

  test('les clés persistables excluent les fiches autonomes, et elles seules', () => {
    for (const key of LEGACY_STEP_KEYS) {
      const standalone = key.startsWith('first-contact.')
      expect(
        ALL_DIAGNOSTIC_STEP_KEYS.has(key),
        `${key} : ${standalone ? 'ne devrait pas être' : 'devrait être'} persistable`
      ).toBe(!standalone)
    }
  })

  test('toute étape liée renvoie vers une fiche existante', () => {
    const steps = [
      ...GLOBAL_CHECKLISTS.flatMap((checklist) => checklist.steps),
      ...Object.values(DIAGNOSTIC_SHEETS).flatMap((sheet) =>
        sheet.sections.flatMap((section) => [...section.steps])
      ),
    ]
    for (const step of steps) {
      if (!step.linkedSheet) continue
      expect(
        DIAGNOSTIC_SHEETS[step.linkedSheet],
        `fiche inconnue : ${step.linkedSheet}`
      ).toBeDefined()
    }
  })

  test('chaque scope de réinitialisation correspond à un préfixe de clés réel', () => {
    for (const scope of DIAGNOSTIC_RESET_SCOPES) {
      if (scope === 'all') continue
      expect(
        [...DIAGNOSTIC_GLOBAL_SCOPES, ...DIAGNOSTIC_SHEET_SLUGS],
        `scope orphelin : ${scope}`
      ).toContain(scope)
    }
  })

  test('les checklists globales servent des familles disjointes', () => {
    const seen = new Set<EngineFamily>()
    for (const checklist of GLOBAL_CHECKLISTS) {
      for (const family of checklist.families) {
        expect(seen.has(family), `famille servie deux fois : ${family}`).toBe(false)
        seen.add(family)
      }
    }
  })

  test('toute famille éligible dispose d’une checklist globale', () => {
    for (const family of ENGINE_FAMILIES) {
      if (sheetsForEngineFamily(family).length === 0) continue
      expect(globalChecklistForFamily(family), `checklist manquante pour ${family}`).not.toBeNull()
    }
  })

  test('les clés i18n du contenu existent dans les deux locales', () => {
    const fr = localeKeys('fr')
    const en = localeKeys('en')

    const contentKeys = [
      ...GLOBAL_CHECKLISTS.flatMap((checklist) => [
        checklist.titleKey,
        checklist.introKey,
        checklist.warningTitleKey,
        ...checklist.warningKeys,
        ...checklist.steps.flatMap((step) =>
          [step.labelKey, step.detailKey].filter((key): key is string => Boolean(key))
        ),
      ]),
      ...Object.values(DIAGNOSTIC_SHEETS).flatMap((sheet) => [
        sheet.titleKey,
        ...[sheet.introKey].filter((key): key is string => Boolean(key)),
        ...(sheet.runningEngineWarning
          ? [sheet.runningEngineWarning.titleKey, sheet.runningEngineWarning.textKey]
          : []),
        ...sheet.warningKeys,
        ...(sheet.noteKeys ?? []),
        ...(sheet.tables ?? []).flatMap((table) => [...table.headerKeys, ...table.rowKeys.flat()]),
        ...sheet.sections.flatMap((section) => [
          ...[section.titleKey].filter((key): key is string => Boolean(key)),
          ...section.steps.flatMap((step) =>
            [step.labelKey, step.detailKey].filter((key): key is string => Boolean(key))
          ),
        ]),
      ]),
    ]

    for (const key of contentKeys) {
      expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
      expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
    }
  })

  test('les avertissements de sécurité imposés par #576 sont présents', () => {
    // Deux rappels que le corpus hors-bord n'avait pas, et dont l'absence
    // serait un défaut de contenu, pas un simple oubli de traduction.
    expect(DIAGNOSTIC_SHEETS.saildrive.warningKeys).toContain(
      'diagnostic.sheets.saildrive.warnings.diaphragmExpiry'
    )
    expect(DIAGNOSTIC_SHEETS['inboard-cooling'].warningKeys).toEqual(
      expect.arrayContaining([
        'diagnostic.sheets.inboard_cooling.warnings.hotPressurisedCircuit',
        'diagnostic.sheets.inboard_cooling.warnings.engineOffBeforeBelt',
      ])
    )
  })
})

describe('Éligibilité au diagnostic par famille (#576)', () => {
  test('le hors-bord 2 temps garde exactement le comportement de #515', () => {
    const engine = { kind: 'outboard', fuel: 'essence', strokeType: '2_stroke', family: null }

    expect(isDiagnosticEligibleEngine(engine)).toBe(true)
    expect(globalChecklistForFamily('outboard_2t')).toBe(GLOBAL_CHECKLIST)
    expect(sheetsForEngineFamily('outboard_2t').map((sheet) => sheet.slug)).toEqual([
      'compression',
      'ignition',
      'fuel',
      'cooling',
      'gearcase',
      'electrical',
      'timing',
    ])
  })

  test('un in-bord diesel devient éligible, avec les fiches de sa transmission', () => {
    const shaft = { kind: 'inboard', fuel: 'diesel', strokeType: null, family: null }
    expect(isDiagnosticEligibleEngine(shaft)).toBe(true)
    expect(isSheetForEngine(shaft, 'shaft-line')).toBe(true)
    expect(isSheetForEngine(shaft, 'saildrive')).toBe(false)

    const saildrive = { ...shaft, family: 'inboard_diesel_saildrive' }
    expect(isSheetForEngine(saildrive, 'saildrive')).toBe(true)
    expect(isSheetForEngine(saildrive, 'shaft-line')).toBe(false)
  })

  test('aucune fiche 2 temps n’est servie à un in-bord diesel', () => {
    const slugs = sheetsForEngineFamily('inboard_diesel_shaft').map((sheet) => sheet.slug)

    for (const outboardOnly of [
      'compression',
      'ignition',
      'fuel',
      'cooling',
      'gearcase',
      'timing',
    ]) {
      expect(slugs, `fiche 2 temps servie à un diesel : ${outboardOnly}`).not.toContain(
        outboardOnly
      )
    }
  })

  test('la fiche « electrical » est élargie, pas dupliquée : ses sections suivent la famille', () => {
    const sheet = DIAGNOSTIC_SHEETS.electrical

    const outboardSteps = sectionsForFamily(sheet, 'outboard_2t').flatMap((s) => s.steps)
    const inboardSteps = sectionsForFamily(sheet, 'inboard_diesel_shaft').flatMap((s) => s.steps)

    expect(outboardSteps.map((step) => step.key)).toContain('electrical.trim_wiring')
    expect(outboardSteps.map((step) => step.key)).not.toContain('electrical.glow_plugs')
    expect(inboardSteps.map((step) => step.key)).toContain('electrical.glow_plugs')
    expect(inboardSteps.map((step) => step.key)).not.toContain('electrical.trim_wiring')
  })

  test('une famille sans fiche reste non éligible', () => {
    for (const engine of [
      { kind: 'outboard', fuel: 'essence', strokeType: '4_stroke', family: null },
      { kind: 'outboard', fuel: 'electric', strokeType: null, family: null },
      { kind: null, fuel: null, strokeType: null, family: null },
    ]) {
      expect(isDiagnosticEligibleEngine(engine), JSON.stringify(engine)).toBe(false)
    }
  })

  test('la fiche autonome « premier contact » ne rend éligible aucun moteur', () => {
    // Elle est élargie à toutes les familles (achat d'occasion), mais `standalone` :
    // la compter rendrait éligible n'importe quelle motorisation.
    expect(DIAGNOSTIC_SHEETS['first-contact'].standalone).toBe(true)
    expect(sheetsForEngineFamily('jet')).toHaveLength(0)
  })
})
