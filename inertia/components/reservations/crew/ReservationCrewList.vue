<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import CrewConflictList from '~/components/crew/CrewConflictList.vue'
import CrewMemberStatusBadge from '~/components/crew/CrewMemberStatusBadge.vue'
import { useT } from '~/composables/use_t'
import { confirmDelete } from '~/utils/native_dialog'
import type { ReservationCrewRow } from '#shared/types/crew'

/** Équipiers embarqués sur la réservation (#883), skipper en tête. */
const props = defineProps<{
  boatId: number
  reservationId: number
  crew: ReservationCrewRow[]
  canManage: boolean
  canOpenMember: boolean
}>()

const { t } = useT()

function unassign(row: ReservationCrewRow) {
  confirmDelete(
    t('crew.planning.unassignConfirm', { name: row.fullName }),
    `/boats/${props.boatId}/reservations/${props.reservationId}/crew/${row.id}`,
    { preserveScroll: true }
  )
}
</script>

<template>
  <ul v-if="crew.length > 0" class="divide-y divide-border" data-testid="reservation-crew-list">
    <li v-for="row in crew" :key="row.id" class="flex items-start justify-between gap-4 py-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton
            v-if="canOpenMember"
            variant="ghost"
            size="sm"
            class="px-0 font-semibold text-fg"
            route="crew.show"
            :params="{ id: row.crewMemberId }"
          >
            {{ row.fullName }}
          </BaseButton>
          <span v-else class="font-semibold text-fg">{{ row.fullName }}</span>
          <BaseBadge variant="info">{{ t(`crew.planning.roles.${row.role}`) }}</BaseBadge>
          <CrewMemberStatusBadge :status="row.certificationStatus" />
          <BaseBadge v-if="row.certificationLapses" variant="warning">
            {{ t('crew.planning.certificationLapses') }}
          </BaseBadge>
        </div>
        <p v-if="row.notes" class="mt-1 text-sm whitespace-pre-wrap text-fg-muted">
          {{ row.notes }}
        </p>
        <div v-if="row.conflicts.length > 0" class="mt-1">
          <p class="text-xs font-medium text-danger">{{ t('crew.planning.conflictsSince') }}</p>
          <CrewConflictList :conflicts="row.conflicts" />
        </div>
      </div>
      <BaseButton
        v-if="canManage"
        type="button"
        variant="ghost"
        size="sm"
        :aria-label="t('crew.planning.unassignFor', { name: row.fullName })"
        @click="unassign(row)"
      >
        {{ t('crew.planning.unassign') }}
      </BaseButton>
    </li>
  </ul>
  <p v-else class="text-sm text-fg-muted" data-testid="reservation-crew-empty">
    {{ t('crew.planning.noCrew') }}
  </p>
</template>
