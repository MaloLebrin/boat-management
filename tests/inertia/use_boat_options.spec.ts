import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import { useBoatOptions } from '../../inertia/composables/use_boat_options'
import {
  PROPULSION_OPTIONS,
  HULL_MATERIAL_OPTIONS,
  ENGINE_KIND_OPTIONS,
  ENGINE_FUEL_OPTIONS,
  ENGINE_STROKE_TYPE_OPTIONS,
  SAIL_TYPE_OPTIONS,
  RIG_TYPE_OPTIONS,
  NAVIGATION_CATEGORY_OPTIONS,
  SAFETY_EQUIPMENT_TYPE_OPTIONS,
  SAFETY_EQUIPMENT_STATUS_OPTIONS,
  GENERIC_EQUIPMENT_STATUS_OPTIONS,
} from '../../shared/constants/boats/boat_form_options'

function mountComposable() {
  let result: ReturnType<typeof useBoatOptions> | undefined

  mount(
    defineComponent({
      setup() {
        result = useBoatOptions()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('propulsionOptions length matches source constant', () => {
  const { propulsionOptions } = mountComposable()
  expect(propulsionOptions.value).toHaveLength(PROPULSION_OPTIONS.length)
})

test('propulsionOptions each item has value and label as i18n key', () => {
  const { propulsionOptions } = mountComposable()
  propulsionOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(PROPULSION_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.propulsion.${PROPULSION_OPTIONS[i].value}`)
  })
})

test('hullMaterialOptions length matches source constant', () => {
  const { hullMaterialOptions } = mountComposable()
  expect(hullMaterialOptions.value).toHaveLength(HULL_MATERIAL_OPTIONS.length)
})

test('hullMaterialOptions labels are i18n keys', () => {
  const { hullMaterialOptions } = mountComposable()
  hullMaterialOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(HULL_MATERIAL_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.hullMaterial.${HULL_MATERIAL_OPTIONS[i].value}`)
  })
})

test('engineKindOptions length matches source constant', () => {
  const { engineKindOptions } = mountComposable()
  expect(engineKindOptions.value).toHaveLength(ENGINE_KIND_OPTIONS.length)
})

test('engineKindOptions labels are i18n keys', () => {
  const { engineKindOptions } = mountComposable()
  engineKindOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(ENGINE_KIND_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.engineKind.${ENGINE_KIND_OPTIONS[i].value}`)
  })
})

test('engineFuelOptions length matches source constant', () => {
  const { engineFuelOptions } = mountComposable()
  expect(engineFuelOptions.value).toHaveLength(ENGINE_FUEL_OPTIONS.length)
})

test('engineFuelOptions labels are i18n keys', () => {
  const { engineFuelOptions } = mountComposable()
  engineFuelOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(ENGINE_FUEL_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.engineFuel.${ENGINE_FUEL_OPTIONS[i].value}`)
  })
})

test('engineStrokeTypeOptions length matches source constant', () => {
  const { engineStrokeTypeOptions } = mountComposable()
  expect(engineStrokeTypeOptions.value).toHaveLength(ENGINE_STROKE_TYPE_OPTIONS.length)
})

test('engineStrokeTypeOptions labels are i18n keys', () => {
  const { engineStrokeTypeOptions } = mountComposable()
  engineStrokeTypeOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(ENGINE_STROKE_TYPE_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.strokeType.${ENGINE_STROKE_TYPE_OPTIONS[i].value}`)
  })
})

test('sailTypeOptions length matches source constant', () => {
  const { sailTypeOptions } = mountComposable()
  expect(sailTypeOptions.value).toHaveLength(SAIL_TYPE_OPTIONS.length)
})

test('sailTypeOptions labels are i18n keys', () => {
  const { sailTypeOptions } = mountComposable()
  sailTypeOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(SAIL_TYPE_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.sailType.${SAIL_TYPE_OPTIONS[i].value}`)
  })
})

test('rigTypeOptions length matches source constant', () => {
  const { rigTypeOptions } = mountComposable()
  expect(rigTypeOptions.value).toHaveLength(RIG_TYPE_OPTIONS.length)
})

test('rigTypeOptions labels are i18n keys', () => {
  const { rigTypeOptions } = mountComposable()
  rigTypeOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(RIG_TYPE_OPTIONS[i].value)
    expect(opt.label).toBe(`boats.options.rigType.${RIG_TYPE_OPTIONS[i].value}`)
  })
})

test('navigationCategoryOptions length matches source constant', () => {
  const { navigationCategoryOptions } = mountComposable()
  expect(navigationCategoryOptions.value).toHaveLength(NAVIGATION_CATEGORY_OPTIONS.length)
})

test('navigationCategoryOptions labels are i18n keys', () => {
  const { navigationCategoryOptions } = mountComposable()
  navigationCategoryOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(NAVIGATION_CATEGORY_OPTIONS[i].value)
    expect(opt.label).toBe(
      `boats.options.navigationCategory.${NAVIGATION_CATEGORY_OPTIONS[i].value}`
    )
  })
})

test('safetyEquipmentTypeOptions length matches source constant', () => {
  const { safetyEquipmentTypeOptions } = mountComposable()
  expect(safetyEquipmentTypeOptions.value).toHaveLength(SAFETY_EQUIPMENT_TYPE_OPTIONS.length)
})

test('safetyEquipmentTypeOptions labels are i18n keys', () => {
  const { safetyEquipmentTypeOptions } = mountComposable()
  safetyEquipmentTypeOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(SAFETY_EQUIPMENT_TYPE_OPTIONS[i].value)
    expect(opt.label).toBe(
      `boats.options.safetyEquipmentType.${SAFETY_EQUIPMENT_TYPE_OPTIONS[i].value}`
    )
  })
})

test('safetyEquipmentStatusOptions length matches source constant', () => {
  const { safetyEquipmentStatusOptions } = mountComposable()
  expect(safetyEquipmentStatusOptions.value).toHaveLength(SAFETY_EQUIPMENT_STATUS_OPTIONS.length)
})

test('safetyEquipmentStatusOptions labels are i18n keys', () => {
  const { safetyEquipmentStatusOptions } = mountComposable()
  safetyEquipmentStatusOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(SAFETY_EQUIPMENT_STATUS_OPTIONS[i].value)
    expect(opt.label).toBe(
      `boats.options.safetyEquipmentStatus.${SAFETY_EQUIPMENT_STATUS_OPTIONS[i].value}`
    )
  })
})

test('genericEquipmentStatusOptions length matches source constant', () => {
  const { genericEquipmentStatusOptions } = mountComposable()
  expect(genericEquipmentStatusOptions.value).toHaveLength(GENERIC_EQUIPMENT_STATUS_OPTIONS.length)
})

test('genericEquipmentStatusOptions labels are i18n keys', () => {
  const { genericEquipmentStatusOptions } = mountComposable()
  genericEquipmentStatusOptions.value.forEach((opt, i) => {
    expect(opt.value).toBe(GENERIC_EQUIPMENT_STATUS_OPTIONS[i].value)
    expect(opt.label).toBe(
      `boats.options.genericEquipmentStatus.${GENERIC_EQUIPMENT_STATUS_OPTIONS[i].value}`
    )
  })
})
