import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  router: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import SparePartsCartPanel from '../../inertia/components/spare_parts/SparePartsCartPanel.vue'
import SparePartsIdentitySection from '../../inertia/components/spare_parts/SparePartsIdentitySection.vue'
import SparePartsPartList from '../../inertia/components/spare_parts/SparePartsPartList.vue'
import SparePartsReferenceSource from '../../inertia/components/spare_parts/SparePartsReferenceSource.vue'
import { ENGINE_CATALOG_PART_REFERENCES } from '../../database/data/engine_catalog/index'
import { SPARE_PART_ASSEMBLIES } from '../../shared/constants/spare_parts/spare_parts_content'
import {
  referenceExampleFromPattern,
  yamahaReferenceExample,
  YAMAHA_REFERENCE_PATTERN,
} from '../../shared/helpers/spare_parts'
import type { SparePartReferenceRow } from '../../shared/types/spare_parts'

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

const IMPELLER: SparePartReferenceRow = {
  partKey: 'lower-unit.impeller',
  reference: '6E0-44352-00',
  sourceLabel: 'Catalogue Partzilla — Yamaha',
  sourceUrl: 'https://www.partzilla.com/catalog/yamaha',
  verifiedAt: null,
}

describe('Corpus de références constructeur (#575)', () => {
  test('aucune entrée du corpus n’est saisie sans source', () => {
    expect(ENGINE_CATALOG_PART_REFERENCES.length).toBeGreaterThan(0)
    for (const entry of ENGINE_CATALOG_PART_REFERENCES) {
      expect(entry.sourceLabel.trim(), `source manquante : ${entry.reference}`).not.toBe('')
    }
  })

  test('un couple (modèle, pièce) ne porte qu’une référence', () => {
    const keys = ENGINE_CATALOG_PART_REFERENCES.map(
      (entry) => `${entry.brandSlug}/${entry.modelSlug}/${entry.partKey}`
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('Décodage de référence généralisé (#575)', () => {
  test('le comportement Yamaha de #517 est préservé à l’identique', () => {
    // Mêmes attentes que le test de #517 : un code plaque plausible entre dans
    // le gabarit, un nom commercial n'y entre pas et retombe sur `6E0`.
    expect(yamahaReferenceExample('6E0', '14301')).toBe('6E0-14301-00')
    expect(yamahaReferenceExample('F150 XCA', '14301')).toBe('6E0-14301-00')
    expect(yamahaReferenceExample(null, '14301')).toBe('6E0-14301-00')
  })

  test('le motif Yamaha passe par la fonction générique', () => {
    expect(referenceExampleFromPattern(YAMAHA_REFERENCE_PATTERN, '68T', '44352')).toBe(
      '68T-44352-00'
    )
  })

  test('une marque au motif différent décode selon son propre gabarit', () => {
    const pattern = {
      template: '{functionCode}-{modelCode}',
      fallbackModelCode: 'XX',
      modelCodePattern: '^[a-z]{3}$',
      explanationKey: 'parts.assembly.decode.text',
    }

    expect(referenceExampleFromPattern(pattern, 'abc', '12345')).toBe('12345-ABC')
    // Code plaque non conforme au motif de la marque → repli, jamais une
    // reconstitution hasardeuse.
    expect(referenceExampleFromPattern(pattern, '1234', '12345')).toBe('12345-XX')
  })
})

describe('SparePartsReferenceSource (#575)', () => {
  test('une référence n’est jamais affichée sans sa source', () => {
    const wrapper = mount(SparePartsReferenceSource, { props: { reference: IMPELLER } })

    expect(wrapper.text()).toContain('6E0-44352-00')
    expect(wrapper.text()).toContain('Catalogue Partzilla — Yamaha')
    expect(wrapper.get('a').attributes('href')).toBe('https://www.partzilla.com/catalog/yamaha')
  })

  test('une entrée jamais revérifiée le signale', () => {
    const wrapper = mount(SparePartsReferenceSource, { props: { reference: IMPELLER } })
    expect(wrapper.text()).toContain('parts.reference.unverified')
  })

  test('une entrée vérifiée affiche sa date au lieu de l’avertissement', () => {
    const wrapper = mount(SparePartsReferenceSource, {
      props: { reference: { ...IMPELLER, verifiedAt: '2026-08-30' } },
    })

    expect(wrapper.text()).toContain('parts.reference.verifiedAt')
    expect(wrapper.text()).not.toContain('parts.reference.unverified')
  })

  test('une source sans URL reste affichée, en texte', () => {
    const wrapper = mount(SparePartsReferenceSource, {
      props: { reference: { ...IMPELLER, sourceUrl: null } },
    })

    expect(wrapper.text()).toContain('Catalogue Partzilla — Yamaha')
    expect(wrapper.find('a').exists()).toBe(false)
  })
})

describe('SparePartsPartList — références (#575)', () => {
  const assembly = SPARE_PART_ASSEMBLIES['lower-unit']

  test('la pièce dont la référence est connue l’affiche avec sa source', () => {
    const wrapper = mount(SparePartsPartList, {
      props: {
        parts: assembly.parts,
        cartItems: [],
        references: [IMPELLER],
        canManage: true,
        boatId: 1,
        engineId: 2,
      },
    })

    expect(wrapper.text()).toContain('6E0-44352-00')
    expect(wrapper.text()).toContain('Catalogue Partzilla — Yamaha')
  })

  test('sans référence connue, la liste rend exactement l’écran d’avant', () => {
    const wrapper = mount(SparePartsPartList, {
      props: {
        parts: assembly.parts,
        cartItems: [],
        references: [],
        canManage: true,
        boatId: 1,
        engineId: 2,
      },
    })

    expect(wrapper.findComponent(SparePartsReferenceSource).exists()).toBe(false)
    expect(wrapper.text()).toContain('parts.common.addToCart')
    // Les liens revendeurs restent le repli : la liste ne perd rien.
    expect(wrapper.text()).toContain('WATER PUMP REPAIR KIT')
  })
})

describe('SparePartsCartPanel — source de la référence (#575)', () => {
  test('la source est créditée tant que la ligne porte la référence du catalogue', () => {
    const wrapper = mount(SparePartsCartPanel, {
      props: {
        cartItems: [
          { id: 1, partKey: 'lower-unit.impeller', quantity: 1, reference: '6E0-44352-00' },
        ],
        references: [IMPELLER],
        canManage: true,
        boatId: 1,
        engineId: 2,
      },
    })

    expect(wrapper.text()).toContain('Catalogue Partzilla — Yamaha')
  })

  test('une référence saisie par l’utilisateur n’emprunte pas la source du catalogue', () => {
    const wrapper = mount(SparePartsCartPanel, {
      props: {
        cartItems: [
          { id: 1, partKey: 'lower-unit.impeller', quantity: 1, reference: '68T-44352-00' },
        ],
        references: [IMPELLER],
        canManage: true,
        boatId: 1,
        engineId: 2,
      },
    })

    expect(wrapper.text()).not.toContain('Catalogue Partzilla — Yamaha')
  })
})

describe('SparePartsIdentitySection — plaque et numéro de série (#575)', () => {
  const engine = {
    id: 1,
    brand: 'Yamaha',
    model: '6E0',
    catalogBrandSlug: 'yamaha',
    serialNumber: '500552',
    modelCodeMatches: 1,
  }

  test('les aides plaque viennent du backend, sans filtrage local', () => {
    const wrapper = mount(SparePartsIdentitySection, {
      props: {
        boatId: 1,
        engine,
        plateHints: [
          {
            brandSlug: 'yamaha',
            brandName: 'Yamaha',
            locationKey: 'parts.identify.plate.yamaha.location',
            exampleKey: 'parts.identify.plate.yamaha.example',
          },
        ],
        canManage: false,
      },
    })

    expect(wrapper.text()).toContain('Yamaha')
    expect(wrapper.text()).toContain('parts.identify.plate.yamaha.location')
    expect(wrapper.text()).not.toContain('parts.identify.plate.unknownBrand')
  })

  test('une marque sans aide connue le dit, au lieu d’une liste vide', () => {
    const wrapper = mount(SparePartsIdentitySection, {
      props: { boatId: 1, engine, plateHints: [], canManage: false },
    })

    expect(wrapper.text()).toContain('parts.identify.plate.unknownBrand')
  })

  test('un code plaque partagé par plusieurs modèles déclenche la mise en garde précise', () => {
    const wrapper = mount(SparePartsIdentitySection, {
      props: {
        boatId: 1,
        engine: { ...engine, modelCodeMatches: 3 },
        plateHints: [],
        canManage: false,
      },
    })

    // L'avertissement général reste, la précision s'y ajoute.
    expect(wrapper.text()).toContain('parts.identify.serialWarning.text')
    expect(wrapper.text()).toContain('parts.identify.serialWarning.ambiguous')
  })

  test('un code plaque sans ambiguïté n’affiche que la mise en garde générale', () => {
    const wrapper = mount(SparePartsIdentitySection, {
      props: { boatId: 1, engine, plateHints: [], canManage: false },
    })

    expect(wrapper.text()).toContain('parts.identify.serialWarning.text')
    expect(wrapper.text()).not.toContain('parts.identify.serialWarning.ambiguous')
  })
})

describe('i18n des références constructeur (#575)', () => {
  test('les clés existent dans les deux locales', () => {
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    const keys = [
      'parts.reference.label',
      'parts.reference.sourcePrefix',
      'parts.reference.verifiedAt',
      'parts.reference.unverified',
      'parts.identify.plate.unknownBrand',
      'parts.identify.serialWarning.ambiguous',
      'parts.cart.export.headers.referenceSource',
      'parts.cart.export.manualSource',
    ]

    for (const key of keys) {
      expect(fr.has(key), `clé FR manquante : ${key}`).toBe(true)
      expect(en.has(key), `clé EN manquante : ${key}`).toBe(true)
    }
  })

  test('chaque aide plaque déclarée au catalogue a ses clés dans les deux locales', async () => {
    const { ENGINE_CATALOG_BRANDS } = await import('../../database/data/engine_catalog/index')
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    for (const brand of ENGINE_CATALOG_BRANDS) {
      for (const key of [brand.plateLocationKey, brand.plateExampleKey]) {
        if (!key) continue
        expect(fr.has(key), `clé FR manquante : ${key} (${brand.slug})`).toBe(true)
        expect(en.has(key), `clé EN manquante : ${key} (${brand.slug})`).toBe(true)
      }
    }
  })

  test('le texte de décodage déclaré par une marque existe dans les deux locales', async () => {
    const { ENGINE_CATALOG_BRANDS } = await import('../../database/data/engine_catalog/index')
    const en = localeKeys('en')
    const fr = localeKeys('fr')

    for (const brand of ENGINE_CATALOG_BRANDS) {
      const key = brand.referencePattern?.explanationKey
      if (!key) continue
      expect(fr.has(key), `clé FR manquante : ${key} (${brand.slug})`).toBe(true)
      expect(en.has(key), `clé EN manquante : ${key} (${brand.slug})`).toBe(true)
    }
  })
})
