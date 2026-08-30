import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  router: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import SparePartsPartList from '../../inertia/components/spare_parts/SparePartsPartList.vue'
import SparePartsUnreferencedList from '../../inertia/components/spare_parts/SparePartsUnreferencedList.vue'
import {
  ALL_SPARE_PART_KEYS,
  DIAGNOSTIC_SHEET_TO_ASSEMBLY,
  SPARE_PART_ASSEMBLIES,
  SPARE_PART_CATALOG_INDEX,
  UNREFERENCED_PARTS,
} from '../../shared/constants/spare_parts/spare_parts_content'
import { DIAGNOSTIC_SHEETS } from '../../shared/constants/diagnostic/diagnostic_content'
import {
  assembliesForEngine,
  assembliesForEngineFamily,
  GENERIC_ASSEMBLY_SLUGS,
  isAssemblyForEngine,
  isSparePartsEligibleEngine,
  sparePartsBrandFromCatalogSlug,
  yamahaReferenceExample,
} from '../../shared/helpers/spare_parts'
import { ENGINE_FAMILIES } from '../../shared/types/engine_catalog'
import { BOAT_ENGINE_FAMILY_OPTIONS } from '../../shared/constants/boats/boat_form_options'

function flattenKeys(node: unknown, prefix: string): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

function localeKeys(locale: 'en' | 'fr', namespace = 'parts'): Set<string> {
  const raw = readFileSync(join(process.cwd(), 'resources', 'lang', locale, `${namespace}.json`))
  return new Set(flattenKeys(JSON.parse(raw.toString()), namespace))
}

describe('Contenu pièces détachées (#517)', () => {
  test('chaque ensemble a au moins une pièce et un intitulé catalogue EN', () => {
    for (const assembly of Object.values(SPARE_PART_ASSEMBLIES)) {
      expect(assembly.parts.length).toBeGreaterThan(0)
      expect(assembly.catalogLabel).toMatch(/^[A-Z]/)
      for (const part of assembly.parts) {
        expect(part.key.startsWith(`${assembly.slug}.`)).toBe(true)
        expect(part.catalogName).toMatch(/^[A-Z]/)
      }
    }
  })

  test('les clés du catalogue sont uniques et indexées', () => {
    const partCount =
      Object.values(SPARE_PART_ASSEMBLIES).reduce((sum, a) => sum + a.parts.length, 0) +
      UNREFERENCED_PARTS.length
    expect(SPARE_PART_CATALOG_INDEX.size).toBe(partCount)
    expect(ALL_SPARE_PART_KEYS.size).toBe(partCount)
  })

  test('toute clé i18n du contenu existe dans les deux locales', () => {
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    const contentKeys = [
      ...Object.values(SPARE_PART_ASSEMBLIES).flatMap((assembly) => [
        assembly.labelKey,
        assembly.descriptionKey,
        ...assembly.parts.flatMap((part) =>
          [part.labelKey, part.detailKey, part.kitKey, part.priceKey].filter((key): key is string =>
            Boolean(key)
          )
        ),
      ]),
      ...UNREFERENCED_PARTS.flatMap((part) => [part.labelKey, part.adviceKey]),
    ]

    for (const key of contentKeys) {
      expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
      expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
    }
  })

  test('chaque fiche de diagnostic mappée pointe vers un ensemble existant', () => {
    for (const [sheetSlug, assemblySlug] of Object.entries(DIAGNOSTIC_SHEET_TO_ASSEMBLY)) {
      expect(DIAGNOSTIC_SHEETS[sheetSlug as keyof typeof DIAGNOSTIC_SHEETS]).toBeDefined()
      expect(SPARE_PART_ASSEMBLIES[assemblySlug]).toBeDefined()
    }
  })

  test('chaque ensemble déclare au moins une famille de motorisation (#574)', () => {
    for (const assembly of Object.values(SPARE_PART_ASSEMBLIES)) {
      expect(assembly.families.length, `familles manquantes sur ${assembly.slug}`).toBeGreaterThan(
        0
      )
      for (const family of assembly.families) {
        expect(ENGINE_FAMILIES, `famille inconnue sur ${assembly.slug}`).toContain(family)
      }
    }
  })

  test('aucune famille ne se retrouve sans ensemble', () => {
    for (const family of ENGINE_FAMILIES) {
      expect(
        assembliesForEngineFamily(family).length,
        `aucun ensemble pour la famille ${family}`
      ).toBeGreaterThan(0)
    }
  })

  test('une famille absente retombe sur les ensembles génériques, jamais sur du vide', () => {
    const generic = assembliesForEngineFamily(null)
    expect(generic.map((assembly) => assembly.slug)).toEqual([...GENERIC_ASSEMBLY_SLUGS])
  })

  test('éligibilité : la famille décide, plus le seul `kind`', () => {
    // Le hors-bord de #517 reste servi…
    expect(isSparePartsEligibleEngine({ kind: 'outboard', family: 'outboard_4t' })).toBe(true)
    // …et l'in-bord diesel, que #517 fermait, accède désormais à l'écran.
    expect(isSparePartsEligibleEngine({ kind: 'inboard', family: 'inboard_diesel_shaft' })).toBe(
      true
    )
    // Famille absente : la dérivation depuis kind/fuel prend le relais.
    expect(isSparePartsEligibleEngine({ kind: 'inboard', fuel: 'diesel' })).toBe(true)
    // Rien de connu : ensembles génériques, donc écran utilisable quand même.
    expect(isSparePartsEligibleEngine({ kind: 'other' })).toBe(true)
  })

  test('la nomenclature servie suit la famille', () => {
    const inboardDiesel = assembliesForEngine({
      kind: 'inboard',
      fuel: 'diesel',
      family: 'inboard_diesel_shaft',
    }).map((assembly) => assembly.slug)

    expect(inboardDiesel).toContain('injection')
    expect(inboardDiesel).toContain('shaft-line')
    expect(inboardDiesel).toContain('cooling-raw-water')
    // Ni carburateur ni lanceur sur un diesel, ni saildrive sur une ligne d'arbre.
    expect(inboardDiesel).not.toContain('carburetor')
    expect(inboardDiesel).not.toContain('recoil-starter')
    expect(inboardDiesel).not.toContain('saildrive')

    const outboard = assembliesForEngine({ kind: 'outboard', strokeType: '2_stroke' }).map(
      (assembly) => assembly.slug
    )
    expect(outboard).toContain('carburetor')
    expect(outboard).toContain('lower-unit')
    expect(outboard).not.toContain('saildrive')
    // La lubrification est propre au 4 temps : un 2 temps mélange l'huile.
    expect(outboard).not.toContain('lubrication')

    expect(
      assembliesForEngine({
        kind: 'inboard',
        fuel: 'diesel',
        family: 'inboard_diesel_saildrive',
      }).map((assembly) => assembly.slug)
    ).toContain('saildrive')
  })

  test('un ensemble étranger à la famille est refusé', () => {
    const inboard = { kind: 'inboard', family: 'inboard_diesel_shaft' }
    expect(isAssemblyForEngine(inboard, 'injection')).toBe(true)
    expect(isAssemblyForEngine(inboard, 'carburetor')).toBe(false)
    expect(isAssemblyForEngine(inboard, 'saildrive')).toBe(false)
  })

  test('les options du formulaire couvrent exactement les familles, dans l’ordre', () => {
    expect(BOAT_ENGINE_FAMILY_OPTIONS.map((option) => option.value)).toEqual([...ENGINE_FAMILIES])
  })

  test('chaque famille a son libellé dans les deux locales', () => {
    const en = localeKeys('en', 'boats')
    const fr = localeKeys('fr', 'boats')

    for (const family of ENGINE_FAMILIES) {
      const key = `boats.options.engineFamily.${family}`
      expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
      expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
    }
  })

  // La normalisation du texte libre (`Yamaha`, `EVINRUDE 6cv`, `Mariner`) a
  // migré en base avec le catalogue moteur (#573) et est couverte par
  // `tests/functional/boats/engine_catalog.spec.ts`. Ne reste ici que la
  // **couverture** : quelles marques du catalogue ont du contenu pièces.
  test('couverture du corpus pièces par les marques du catalogue', () => {
    expect(sparePartsBrandFromCatalogSlug('yamaha')).toBe('yamaha')
    expect(sparePartsBrandFromCatalogSlug('johnson-evinrude')).toBe('johnson-evinrude')
    expect(sparePartsBrandFromCatalogSlug('mercury-mariner')).toBe('mercury-mariner')
    // Honda est bien une marque du catalogue, mais le corpus pièces v1 ne la
    // couvre pas : les écrans retombent sur les liens revendeurs génériques et
    // les aides plaque de toutes les marques, comme avant #573.
    expect(sparePartsBrandFromCatalogSlug('honda-marine')).toBeNull()
    expect(sparePartsBrandFromCatalogSlug('volvo-penta')).toBeNull()
    expect(sparePartsBrandFromCatalogSlug(null)).toBeNull()
  })

  test('exemple de référence Yamaha construit sur le code modèle du moteur', () => {
    expect(yamahaReferenceExample('6E0', '14301')).toBe('6E0-14301-00')
    expect(yamahaReferenceExample('F150 XCA', '14301')).toBe('6E0-14301-00')
    expect(yamahaReferenceExample(null, '14301')).toBe('6E0-14301-00')
  })
})

describe('SparePartsPartList (#517)', () => {
  test('affiche le nom FR (clé i18n) et l’intitulé catalogue EN côte à côte', () => {
    const assembly = SPARE_PART_ASSEMBLIES.carburetor
    const wrapper = mount(SparePartsPartList, {
      props: { parts: assembly.parts, cartItems: [], canManage: true, boatId: 1, engineId: 2 },
    })

    expect(wrapper.text()).toContain('parts.assemblies.carburetor.parts.repair_kit.label')
    expect(wrapper.text()).toContain('GASKET, FLOAT CHAMBER')
    expect(wrapper.text()).toContain('parts.assemblies.carburetor.parts.float_chamber_gasket.kit')
  })

  test('signale les pièces déjà dans la liste de réparation', () => {
    const assembly = SPARE_PART_ASSEMBLIES.carburetor
    const wrapper = mount(SparePartsPartList, {
      props: {
        parts: assembly.parts,
        cartItems: [{ id: 1, partKey: 'carburetor.repair_kit', quantity: 2, reference: null }],
        canManage: true,
        boatId: 1,
        engineId: 2,
      },
    })

    expect(wrapper.text()).toContain('parts.common.inCart')
    expect(wrapper.text()).toContain('×2')
  })
})

describe('SparePartsUnreferencedList (#517)', () => {
  test('rend les cinq catégories sans référence avec leur conseil d’achat', () => {
    const wrapper = mount(SparePartsUnreferencedList, {
      props: { cartItems: [], canManage: false, boatId: 1, engineId: 2 },
    })

    expect(wrapper.text()).toContain('parts.unreferenced.items.fuel_hose.advice')
    expect(wrapper.text()).toContain('parts.unreferenced.items.spark_plug.label')
    expect(wrapper.text()).toContain('parts.unreferenced.items.shear_pin.label')
  })
})
