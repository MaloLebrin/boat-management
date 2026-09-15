import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useT } from '~/composables/use_t'
import { engineKindLabel, engineSerialSuffix, sailTypeLabel } from '~/utils/boat_enum_labels'
import type { TaskEquipmentRef, TaskEquipmentSource } from '#shared/types/maintenance'

export interface TaskEquipmentOption {
  value: string
  label: string
}

/**
 * Libellés des équipements d'un bateau pour le formulaire de tâche : options de
 * sélection par type, et libellé d'un équipement verrouillé (puce en lecture seule).
 */
export function useTaskEquipmentOptions(source: MaybeRefOrGetter<TaskEquipmentSource>) {
  const { t } = useT()

  const engineOptions = computed<TaskEquipmentOption[]>(() =>
    toValue(source).engines.map((e) => ({
      value: String(e.id),
      label: `${`${engineKindLabel(t, e.kind) ?? e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim()}${engineSerialSuffix(t, e.serialNumber)}`,
    }))
  )

  const sailOptions = computed<TaskEquipmentOption[]>(() =>
    toValue(source).sails.map((s) => ({
      value: String(s.id),
      label: `${sailTypeLabel(t, s.sailType) ?? s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
    }))
  )

  const safetyOptions = computed<TaskEquipmentOption[]>(() =>
    toValue(source).safetyEquipment.map((item) => ({
      value: String(item.id),
      label: t(`boats.options.safetyEquipmentType.${item.equipmentType}`),
    }))
  )

  const genericOptions = computed<TaskEquipmentOption[]>(() =>
    toValue(source).genericEquipment.map((item) => ({
      value: String(item.id),
      label: item.name,
    }))
  )

  function equipmentLabel(ref: TaskEquipmentRef): string {
    if (ref.type === 'rig') return t('boats.maintenance.tasks.rig')
    const options = {
      engine: engineOptions,
      sail: sailOptions,
      safety: safetyOptions,
      generic: genericOptions,
    }[ref.type]
    return options.value.find((o) => o.value === String(ref.id))?.label ?? ''
  }

  return { engineOptions, sailOptions, safetyOptions, genericOptions, equipmentLabel }
}
