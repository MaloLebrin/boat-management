<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'

const props = defineProps<{
  boatId: number
  reservations: BoatReservationRow[]
  canManage: boolean
}>()

const { t } = useT()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function deleteReservation(id: number) {
  if (!window.confirm(t('reservations.form.confirmDelete'))) return
  router.delete(`/boats/${props.boatId}/reservations/${id}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard>
    <BaseEmptyState
      v-if="reservations.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.description')"
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-border text-left text-xs font-semibold uppercase text-fg-muted"
          >
            <th class="pb-2 pr-4">{{ t('reservations.columns.period') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.client') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.status') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.price') }}</th>
            <th v-if="canManage" class="pb-2" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="row in reservations" :key="row.id" class="py-2">
            <td class="py-2 pr-4 text-fg">
              {{ formatDate(row.startsAt) }} → {{ formatDate(row.endsAt) }}
            </td>
            <td class="py-2 pr-4">
              <span class="font-medium text-fg">{{ row.clientName }}</span>
              <span v-if="row.clientEmail" class="block text-xs text-fg-muted">{{
                row.clientEmail
              }}</span>
            </td>
            <td class="py-2 pr-4">
              <ReservationStatusBadge :status="row.status" />
            </td>
            <td class="py-2 pr-4 text-fg">
              {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
            </td>
            <td v-if="canManage" class="py-2 text-right">
              <BaseButton variant="ghost" size="sm" @click="deleteReservation(row.id)">
                {{ t('reservations.form.delete') }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>
</template>
