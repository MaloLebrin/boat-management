<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { useTaskEquipmentOptions } from '~/composables/use_task_equipment_options'
import type { IncidentTargetRef, IncidentTargetType } from '#shared/types/incident'
import type { TaskEquipmentSource } from '#shared/types/maintenance'

/**
 * Équipement ou pièce visé par un incident (#813). Libre : un seul sélecteur
 * qui mêle toutes les familles, « Tout le bateau » par défaut. Verrouillé
 * (point d'entrée équipement) : une puce en lecture seule. Sans `equipment`
 * (page flotte, dashboard), rien n'est proposé : l'incident vise le bateau.
 */
const props = withDefaults(
  defineProps<{
    equipment?: TaskEquipmentSource | null
    lockedTarget?: IncidentTargetRef | null
    /** Libellé de la puce verrouillée — obligatoire pour une pièce, inconnue de `equipment`. */
    lockedLabel?: string | null
    error?: string
  }>(),
  { equipment: null, lockedTarget: null, lockedLabel: null, error: undefined }
)

const target = defineModel<IncidentTargetRef | null>('target', { required: true })

const { t } = useT()
const EMPTY_SOURCE: TaskEquipmentSource = {
  engines: [],
  sails: [],
  rig: null,
  safetyEquipment: [],
  genericEquipment: [],
}
const { engineOptions, sailOptions, safetyOptions, genericOptions, equipmentLabel } =
  useTaskEquipmentOptions(() => props.equipment ?? EMPTY_SOURCE)

function family(type: IncidentTargetType) {
  return t(`incidents.target.${type}`)
}

const options = computed(() => {
  const withFamily = (type: IncidentTargetType, items: Array<{ value: string; label: string }>) =>
    items.map((o) => ({ value: `${type}:${o.value}`, label: `${family(type)} · ${o.label}` }))
  return [
    ...withFamily('engine', engineOptions.value),
    ...withFamily('sail', sailOptions.value),
    ...(props.equipment?.rig
      ? [{ value: `rig:${props.equipment.rig.id}`, label: family('rig') }]
      : []),
    ...withFamily('safety', safetyOptions.value),
    ...withFamily('generic', genericOptions.value),
  ]
})

const selected = computed({
  get: () => (target.value ? `${target.value.type}:${target.value.id}` : ''),
  set: (value: string | number) => {
    const [type, id] = String(value).split(':')
    target.value = type && id ? { type: type as IncidentTargetType, id: Number(id) } : null
  },
})

const lockedText = computed(() => {
  if (!props.lockedTarget) return ''
  const { type, id } = props.lockedTarget
  // `equipmentLabel` ne connaît pas la pièce : son nom vient de `lockedLabel`.
  const label = props.lockedLabel ?? (type === 'engine_part' ? '' : equipmentLabel({ type, id }))
  return label ? `${family(type)} · ${label}` : family(type)
})
</script>

<template>
  <div v-if="lockedTarget" class="space-y-1">
    <p class="text-sm font-medium text-fg">{{ t('incidents.fields.target') }}</p>
    <span
      data-testid="incident-locked-target"
      class="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand"
    >
      {{ lockedText }}
    </span>
  </div>

  <BaseSelect
    v-else-if="options.length > 0"
    id="incident-target"
    name="target"
    v-model="selected"
    :label="t('incidents.fields.target')"
    :placeholder="t('incidents.target.wholeBoat')"
    :options="options"
    :error="error"
    allow-empty
  />
</template>
