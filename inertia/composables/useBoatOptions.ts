import { computed } from 'vue'
import {
  ENGINE_FUEL_OPTIONS,
  ENGINE_KIND_OPTIONS,
  ENGINE_STROKE_TYPE_OPTIONS,
  HULL_MATERIAL_OPTIONS,
  NAVIGATION_CATEGORY_OPTIONS,
  PROPULSION_OPTIONS,
  RIG_TYPE_OPTIONS,
  SAFETY_EQUIPMENT_STATUS_OPTIONS,
  SAFETY_EQUIPMENT_TYPE_OPTIONS,
  SAIL_TYPE_OPTIONS,
} from '#shared/constants/boats/boat_form_options'
import { useT } from './useT'

export function useBoatOptions() {
  const { t } = useT()

  const propulsionOptions = computed(() =>
    PROPULSION_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.propulsion.${o.value}`),
    }))
  )

  const hullMaterialOptions = computed(() =>
    HULL_MATERIAL_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.hullMaterial.${o.value}`),
    }))
  )

  const engineKindOptions = computed(() =>
    ENGINE_KIND_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.engineKind.${o.value}`),
    }))
  )

  const engineFuelOptions = computed(() =>
    ENGINE_FUEL_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.engineFuel.${o.value}`),
    }))
  )

  const engineStrokeTypeOptions = computed(() =>
    ENGINE_STROKE_TYPE_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.strokeType.${o.value}`),
    }))
  )

  const sailTypeOptions = computed(() =>
    SAIL_TYPE_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.sailType.${o.value}`),
    }))
  )

  const rigTypeOptions = computed(() =>
    RIG_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.rigType.${o.value}`) }))
  )

  const navigationCategoryOptions = computed(() =>
    NAVIGATION_CATEGORY_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.navigationCategory.${o.value}`),
    }))
  )

  const safetyEquipmentTypeOptions = computed(() =>
    SAFETY_EQUIPMENT_TYPE_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.safetyEquipmentType.${o.value}`),
    }))
  )

  const safetyEquipmentStatusOptions = computed(() =>
    SAFETY_EQUIPMENT_STATUS_OPTIONS.map((o) => ({
      value: o.value,
      label: t(`boats.options.safetyEquipmentStatus.${o.value}`),
    }))
  )

  return {
    propulsionOptions,
    hullMaterialOptions,
    engineKindOptions,
    engineFuelOptions,
    engineStrokeTypeOptions,
    sailTypeOptions,
    rigTypeOptions,
    navigationCategoryOptions,
    safetyEquipmentTypeOptions,
    safetyEquipmentStatusOptions,
  }
}
