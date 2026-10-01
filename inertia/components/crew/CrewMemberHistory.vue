<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { CrewMemberHistoryEntry } from '#shared/types/crew'

/** Embarquements d'un équipier (#883) : réservations et sorties du journal de bord. */
defineProps<{
  history: CrewMemberHistoryEntry[]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

function roleLabel(entry: CrewMemberHistoryEntry): string {
  return entry.role === 'passenger'
    ? t('crew.pdf.roles.passenger')
    : t(`crew.planning.roles.${entry.role}`)
}
</script>

<template>
  <ul v-if="history.length > 0" class="divide-y divide-border" data-testid="crew-member-history">
    <li
      v-for="entry in history"
      :key="`${entry.kind}-${entry.id}`"
      class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
    >
      <div class="min-w-0">
        <p class="font-medium text-fg">
          {{ entry.boatName }}
          <span v-if="entry.label" class="font-normal text-fg-muted">· {{ entry.label }}</span>
        </p>
        <p class="text-fg-muted">
          {{ formatDate(entry.startsAt) }}
          <template v-if="entry.endsAt">→ {{ formatDate(entry.endsAt) }}</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <BaseBadge :variant="entry.kind === 'reservation' ? 'info' : 'neutral'">
          {{ t(`crew.planning.history.kind.${entry.kind}`) }}
        </BaseBadge>
        <BaseBadge variant="neutral">{{ roleLabel(entry) }}</BaseBadge>
        <BaseButton
          v-if="entry.kind === 'reservation'"
          variant="ghost"
          size="sm"
          route="boats.reservations.crew.show"
          :params="{ boatId: entry.boatId, reservationId: entry.id }"
        >
          {{ t('crew.planning.history.open') }}
        </BaseButton>
        <BaseButton
          v-else
          variant="ghost"
          size="sm"
          route="boats.navigationLogs.show"
          :params="{ boatId: entry.boatId, logId: entry.id }"
        >
          {{ t('crew.planning.history.open') }}
        </BaseButton>
      </div>
    </li>
  </ul>
  <p v-else class="text-sm text-fg-muted">{{ t('crew.planning.history.empty') }}</p>
</template>
