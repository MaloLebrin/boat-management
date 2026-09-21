<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { sailTypeLabel } from '~/utils/boat_enum_labels'
import type { IncidentTargetSummary } from '~/types/boat_show'

/**
 * Puce « Moteur · Yamaha F100 » sur une ligne d'incident (#813), qui mène à la
 * page de l'équipement ou de la pièce visé. `name` arrive brut du serveur :
 * une clé d'enum pour une voile ou un équipement de sécurité, un texte sinon.
 */
const props = defineProps<{ target: IncidentTargetSummary; boatId: number }>()

const { t } = useT()

const name = computed(() => {
  const { type, name: raw } = props.target
  if (!raw) return null
  if (type === 'sail') return sailTypeLabel(t, raw) ?? raw
  if (type === 'safety') return t(`boats.options.safetyEquipmentType.${raw}`)
  return raw
})

const label = computed(() => {
  const family = t(`incidents.target.${props.target.type}`)
  return name.value ? `${family} · ${name.value}` : family
})

const href = computed(() => {
  const base = `/boats/${props.boatId}`
  const { type, id, engineId } = props.target
  switch (type) {
    case 'engine':
      return `${base}/engines/${id}`
    case 'sail':
      return `${base}/sails/${id}`
    case 'rig':
      return `${base}/rig`
    case 'safety':
      return `${base}/safety-equipment/${id}`
    case 'generic':
      return `${base}/generic-equipment/${id}`
    case 'engine_part':
      return engineId ? `${base}/engines/${engineId}/parts/${id}` : null
    default:
      return null
  }
})

const badgeClass =
  'inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand'
</script>

<template>
  <Link
    v-if="href"
    :href="href"
    :class="[badgeClass, 'hover:underline']"
    data-testid="incident-target"
  >
    {{ label }}
  </Link>
  <span v-else :class="badgeClass" data-testid="incident-target">{{ label }}</span>
</template>
