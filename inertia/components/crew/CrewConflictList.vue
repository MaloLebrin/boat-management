<script setup lang="ts">
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { CrewConflict } from '#shared/types/crew'

/** Ce qui occupe un équipier sur un créneau (#883) : réservation ou indisponibilité. */
defineProps<{
  conflicts: CrewConflict[]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <ul class="space-y-0.5 text-xs text-danger" data-testid="crew-conflicts">
    <li v-for="conflict in conflicts" :key="`${conflict.kind}-${conflict.id}`">
      {{
        t(`crew.planning.conflict.${conflict.kind}`, {
          label: conflict.label ?? t('crew.planning.conflict.noReason'),
          from: formatDate(conflict.startsAt),
          to: formatDate(conflict.endsAt),
        })
      }}
    </li>
  </ul>
</template>
