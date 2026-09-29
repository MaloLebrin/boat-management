<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { PublicBookingBoatCard } from '#shared/types/public_booking'

/** Ligne de caractéristiques d'un bateau sur la page publique (#881). */
const props = defineProps<{ boat: PublicBookingBoatCard }>()

const { t } = useT()
const { formatLength } = useNumberFormat()

const specs = computed(() =>
  [
    props.boat.type,
    props.boat.lengthM !== null ? formatLength(props.boat.lengthM) : null,
    props.boat.maxPersons !== null
      ? t('public.booking.boat.maxPersons', { count: String(props.boat.maxPersons) })
      : null,
    props.boat.homePort,
  ].filter((part): part is string => Boolean(part))
)
</script>

<template>
  <p v-if="specs.length" class="text-sm text-fg-muted">{{ specs.join(' · ') }}</p>
</template>
