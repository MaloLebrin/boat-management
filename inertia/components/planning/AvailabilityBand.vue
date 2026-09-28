<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'

/**
 * Bande d'indisponibilité (#869), commune aux deux calendriers :
 *
 * - `/planning` y pose les **réservations** sous les tâches ;
 * - `/reservations` y pose les **entretiens planifiés** sous les locations.
 *
 * Non déplaçable. Avec `href`, la bande mène à l'écran qui la porte ; sans
 * `label`, elle se réduit à un liseré (frise, où la place manque).
 */
const props = defineProps<{
  kind: 'reservation-confirmed' | 'reservation-option' | 'maintenance'
  title: string
  label?: string
  href?: string
}>()

const toneClass: Record<(typeof props)['kind'], string> = {
  'reservation-confirmed': 'bg-mint-100 text-mint-700 border-mint-600',
  'reservation-option': 'bg-peach-100 text-peach-800 border-peach-300',
  'maintenance': 'bg-sky-100 text-sky-800 border-sky-300',
}
</script>

<template>
  <component
    :is="href ? Link : 'div'"
    :href="href"
    :title="title"
    :aria-label="title"
    class="block truncate border-l-2"
    :class="[
      toneClass[kind],
      label ? 'rounded-sm px-1 py-0.5 text-[11px] font-medium' : 'h-1.5 rounded-full',
      href ? 'hover:opacity-80' : '',
    ]"
    :data-testid="`availability-band-${kind}`"
  >
    {{ label }}
  </component>
</template>
