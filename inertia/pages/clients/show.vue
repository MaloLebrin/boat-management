<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Head, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import ClientDocuments from '~/components/clients/ClientDocuments.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { ClientRow } from '../../../shared/types/client'
import type { BoatReservationRow } from '../../../shared/types/reservation'
import type { MediaRow } from '~/types/boat_show'

const props = defineProps<{
  client: ClientRow
  reservations: BoatReservationRow[]
  documents: MediaRow[]
  canManage: boolean
  canAnonymize: boolean
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

const isAnonymizeModalOpen = ref(false)

function anonymize() {
  router.post(`/clients/${props.client.id}/anonymize`, {}, { preserveScroll: true })
  isAnonymizeModalOpen.value = false
}
</script>

<template>
  <Head :title="client.fullName" />

  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
      <Link href="/clients" class="transition-colors hover:text-fg">{{ t('clients.title') }}</Link>
      <span class="select-none">></span>
      <span class="font-medium text-fg">{{ client.fullName }}</span>
    </nav>

    <!-- Header -->
    <div class="flex items-center gap-3">
      <BaseHeading level="1">{{ client.fullName }}</BaseHeading>
      <ClientStatusBadge :status="client.status" />
      <span
        v-if="client.anonymizedAt"
        class="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted"
      >
        {{ t('clients.gdpr.anonymized') }}
      </span>
    </div>

    <!-- Info -->
    <BaseCard class="mt-6">
      <p class="mb-4 text-sm font-semibold text-fg">{{ t('clients.show.info') }}</p>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-fg-muted">{{ t('clients.columns.email') }}</dt>
          <dd class="font-medium text-fg">{{ client.email ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('clients.columns.phone') }}</dt>
          <dd class="font-medium text-fg">{{ client.phone ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('clients.fields.address') }}</dt>
          <dd class="font-medium text-fg">{{ client.address ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('clients.columns.permit') }}</dt>
          <dd class="font-medium text-fg">{{ client.navigationPermitNumber ?? '—' }}</dd>
        </div>
      </dl>
      <p v-if="client.notes" class="mt-4 whitespace-pre-wrap text-sm text-fg-muted">
        {{ client.notes }}
      </p>
    </BaseCard>

    <!-- Documents -->
    <ClientDocuments
      :client-id="client.id"
      :client-name="client.fullName"
      :documents="documents"
      :can-manage="canManage"
    />

    <!-- GDPR -->
    <BaseCard class="mt-4">
      <BaseConfirmModal
        :open="isAnonymizeModalOpen"
        :title="t('clients.gdpr.anonymizeConfirm.title')"
        :message="t('clients.gdpr.anonymizeConfirm.message')"
        :confirm-label="t('clients.gdpr.anonymize')"
        @update:open="isAnonymizeModalOpen = false"
        @confirm="anonymize"
      />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-fg">{{ t('clients.gdpr.consentTitle') }}</p>
          <p class="mt-1 text-sm text-fg-muted">
            <template v-if="client.gdprConsentAt">
              {{ t('clients.gdpr.consentGiven', { date: formatDate(client.gdprConsentAt) }) }}
            </template>
            <template v-else>{{ t('clients.gdpr.consentNotGiven') }}</template>
          </p>
          <p v-if="client.anonymizedAt" class="mt-1 text-sm text-fg-muted">
            {{ t('clients.gdpr.anonymizedOn', { date: formatDate(client.anonymizedAt) }) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a
            v-if="canManage"
            :href="`/clients/${client.id}/export`"
            class="text-sm font-medium text-brand hover:underline"
          >
            {{ t('clients.gdpr.export') }}
          </a>
          <BaseButton
            v-if="canAnonymize && !client.anonymizedAt"
            variant="danger"
            size="sm"
            @click="isAnonymizeModalOpen = true"
          >
            {{ t('clients.gdpr.anonymize') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Reservation history -->
    <BaseCard class="mt-4">
      <p class="mb-4 text-sm font-semibold text-fg">
        {{ t('clients.show.reservationHistory') }}
      </p>

      <BaseEmptyState
        v-if="reservations.length === 0"
        :title="t('clients.show.noReservations')"
        :description="''"
      />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-fg-muted">
              <th class="pb-2 pr-4 font-medium">{{ t('reservations.columns.boat') }}</th>
              <th class="pb-2 pr-4 font-medium">{{ t('reservations.columns.period') }}</th>
              <th class="pb-2 pr-4 font-medium">{{ t('reservations.columns.status') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('reservations.columns.price') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reservations" :key="row.id" class="border-b border-border">
              <td class="py-2 pr-4 font-medium text-fg">{{ row.boatName }}</td>
              <td class="py-2 pr-4 text-fg-muted">
                {{ formatDate(row.startsAt) }} → {{ formatDate(row.endsAt) }}
              </td>
              <td class="py-2 pr-4">
                <ReservationStatusBadge :status="row.status" />
              </td>
              <td class="py-2 text-right font-medium text-fg">
                {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
