<script setup lang="ts">
import { router, useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import ContractStatusBadge from '~/components/reservations/contract/ContractStatusBadge.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { RentalContractRow } from '~/types/rental_contract'

const props = defineProps<{
  boatId: number
  reservationId: number
  contract: RentalContractRow | null
  canEdit: boolean
  canDelete: boolean
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

const basePath = `/boats/${props.boatId}/reservations/${props.reservationId}/contract`

const fileInput = ref<HTMLInputElement>()
const signForm = useForm({ file: null as File | null })

function generate() {
  router.post(basePath, {}, { preserveScroll: true })
}

function send() {
  router.post(`${basePath}/send`, {}, { preserveScroll: true })
}

function onSignedFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  signForm.file = input.files?.[0] ?? null
  if (signForm.file) submitSignedDocument()
}

function submitSignedDocument() {
  signForm.post(`${basePath}/sign`, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      signForm.reset()
      if (fileInput.value) fileInput.value.value = ''
    },
  })
}

function destroy() {
  if (!window.confirm(t('rentalContracts.actions.confirmDelete'))) return
  router.delete(basePath, { preserveScroll: true })
}
</script>

<template>
  <BaseCard class="space-y-4 p-5">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-fg">{{ t('rentalContracts.title') }}</h3>
      <ContractStatusBadge v-if="contract" :status="contract.status" />
    </div>

    <p v-if="!contract" class="text-sm text-fg-muted">{{ t('rentalContracts.empty') }}</p>

    <div v-else class="space-y-1 text-sm text-fg-muted">
      <p>{{ t('rentalContracts.createdAt', { date: formatDate(contract.createdAt) }) }}</p>
      <p v-if="contract.signedAt">
        {{ t('rentalContracts.signedAt', { date: formatDate(contract.signedAt) }) }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseButton v-if="!contract && canEdit" variant="primary" size="sm" @click="generate">
        {{ t('rentalContracts.actions.generate') }}
      </BaseButton>

      <BaseButton
        v-if="contract"
        variant="secondary"
        size="sm"
        :href="`${basePath}/pdf`"
        target="_blank"
        rel="noopener"
      >
        {{ t('rentalContracts.actions.download') }}
      </BaseButton>

      <BaseButton
        v-if="contract && contract.mediaSecureUrl"
        variant="secondary"
        size="sm"
        :href="contract.mediaSecureUrl"
        target="_blank"
        rel="noopener"
      >
        {{ t('rentalContracts.actions.viewSigned') }}
      </BaseButton>

      <BaseButton
        v-if="contract && contract.status === 'draft' && canEdit"
        variant="primary"
        size="sm"
        @click="send"
      >
        {{ t('rentalContracts.actions.send') }}
      </BaseButton>

      <template
        v-if="contract && (contract.status === 'sent' || contract.status === 'signed') && canEdit"
      >
        <input
          ref="fileInput"
          type="file"
          accept="application/pdf,.pdf"
          class="hidden"
          @change="onSignedFileChange"
        />
        <BaseButton
          variant="primary"
          size="sm"
          type="button"
          :disabled="signForm.processing"
          @click="fileInput?.click()"
        >
          {{
            contract.status === 'signed'
              ? t('rentalContracts.actions.replaceSigned')
              : t('rentalContracts.actions.uploadSigned')
          }}
        </BaseButton>
      </template>

      <BaseButton v-if="contract && canDelete" variant="danger" size="sm" @click="destroy">
        {{ t('rentalContracts.actions.delete') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
