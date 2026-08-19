import { describe, expect, test } from 'vitest'
import {
  engineCaptionLabel,
  engineDisplayTitle,
  engineFuelLabel,
  engineKindLabel,
  maintenanceSubjectLabel,
  rigTypeLabel,
  sailTypeLabel,
} from '../../inertia/utils/boat_enum_labels'
import { ENGINE_KIND_OPTIONS } from '../../shared/constants/boats/boat_form_options'
import enBoats from '../../resources/lang/en/boats.json'
import frBoats from '../../resources/lang/fr/boats.json'

const t = (key: string) => `translated:${key}`

describe('engineKindLabel', () => {
  test('translates a known engine kind', () => {
    expect(engineKindLabel(t, 'outboard')).toBe('translated:boats.options.engineKind.outboard')
  })

  test('returns null for a null or undefined value', () => {
    expect(engineKindLabel(t, null)).toBeNull()
    expect(engineKindLabel(t, undefined)).toBeNull()
  })

  test('falls back to the raw value for an unknown engine kind', () => {
    expect(engineKindLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('engineFuelLabel', () => {
  test('translates a known fuel type', () => {
    expect(engineFuelLabel(t, 'essence')).toBe('translated:boats.options.engineFuel.essence')
  })

  test('falls back to the raw value for an unknown fuel type', () => {
    expect(engineFuelLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('sailTypeLabel', () => {
  test('translates a known sail type', () => {
    expect(sailTypeLabel(t, 'genoa')).toBe('translated:boats.options.sailType.genoa')
  })

  test('falls back to the raw value for an unknown sail type', () => {
    expect(sailTypeLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('rigTypeLabel', () => {
  test('translates a known rig type', () => {
    expect(rigTypeLabel(t, 'sloop')).toBe('translated:boats.options.rigType.sloop')
  })

  test('falls back to the raw value for an unknown rig type', () => {
    expect(rigTypeLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('maintenanceSubjectLabel', () => {
  test('translates a known maintenance subject', () => {
    expect(maintenanceSubjectLabel(t, 'engine')).toBe(
      'translated:maintenance.history.subjects.engine'
    )
  })

  test('falls back to the raw value for an unknown subject', () => {
    expect(maintenanceSubjectLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('engineCaptionLabel', () => {
  test('translates a caption that fell back to the raw engine kind token (#472)', () => {
    expect(engineCaptionLabel(t, 'inboard')).toBe('translated:boats.options.engineKind.inboard')
  })

  test('leaves a free-text caption untouched', () => {
    expect(engineCaptionLabel(t, 'Volvo Penta D2-40')).toBe('Volvo Penta D2-40')
  })

  test('returns null for an empty caption', () => {
    expect(engineCaptionLabel(t, null)).toBeNull()
    expect(engineCaptionLabel(t, '')).toBeNull()
  })
})

describe('engineDisplayTitle', () => {
  test('joins brand and model when both are known', () => {
    expect(engineDisplayTitle(t, { brand: 'Volvo Penta', model: 'D2-40', kind: 'inboard' })).toBe(
      'Volvo Penta D2-40'
    )
  })

  test('uses whichever of brand or model is known', () => {
    expect(engineDisplayTitle(t, { brand: 'Yamaha', model: null, kind: 'outboard' })).toBe('Yamaha')
    expect(engineDisplayTitle(t, { brand: null, model: 'F8', kind: 'outboard' })).toBe('F8')
  })

  test('falls back to the translated kind rather than the raw token (#472)', () => {
    expect(engineDisplayTitle(t, { brand: null, model: null, kind: 'inboard' })).toBe(
      'translated:boats.options.engineKind.inboard'
    )
  })

  test('falls back to the raw kind when it is not a known enum value', () => {
    expect(engineDisplayTitle(t, { brand: null, model: null, kind: 'legacy-value' })).toBe(
      'legacy-value'
    )
  })
})

describe('engine kind translations (#472)', () => {
  test('every engine kind is translated in both locales, in both key families', () => {
    for (const { value } of ENGINE_KIND_OPTIONS) {
      expect(enBoats.options.engineKind).toHaveProperty(value)
      expect(frBoats.options.engineKind).toHaveProperty(value)
      expect(enBoats.engines.kindValues).toHaveProperty(value)
      expect(frBoats.engines.kindValues).toHaveProperty(value)
    }
  })

  test('the two key families agree on the same wording', () => {
    for (const { value } of ENGINE_KIND_OPTIONS) {
      const key = value as keyof typeof frBoats.options.engineKind
      expect(frBoats.engines.kindValues[key]).toBe(frBoats.options.engineKind[key])
      expect(enBoats.engines.kindValues[key]).toBe(enBoats.options.engineKind[key])
    }
  })

  test('« inboard » uses the French spelling « In-bord », like « Hors-bord »', () => {
    expect(frBoats.options.engineKind.inboard).toBe('In-bord')
    expect(frBoats.options.engineKind.outboard).toBe('Hors-bord')
  })
})
