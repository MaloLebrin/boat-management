import { computed } from 'vue'
import {
  ENGINE_FUEL_OPTIONS,
  ENGINE_KIND_OPTIONS,
  HULL_MATERIAL_OPTIONS,
  PROPULSION_OPTIONS,
  RIG_TYPE_OPTIONS,
  SAIL_TYPE_OPTIONS,
} from '#shared/constants/boats/boat_form_options'
import { useT } from './useT'

export function useBoatOptions() {
  const { t } = useT()

  const propulsionOptions = computed(() =>
    PROPULSION_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.propulsion.${o.value}`) }))
  )

  const hullMaterialOptions = computed(() =>
    HULL_MATERIAL_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.hullMaterial.${o.value}`) }))
  )

  const engineKindOptions = computed(() =>
    ENGINE_KIND_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.engineKind.${o.value}`) }))
  )

  const engineFuelOptions = computed(() =>
    ENGINE_FUEL_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.engineFuel.${o.value}`) }))
  )

  const sailTypeOptions = computed(() =>
    SAIL_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.sailType.${o.value}`) }))
  )

  const rigTypeOptions = computed(() =>
    RIG_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(`boats.options.rigType.${o.value}`) }))
  )

  return {
    propulsionOptions,
    hullMaterialOptions,
    engineKindOptions,
    engineFuelOptions,
    sailTypeOptions,
    rigTypeOptions,
  }
}
