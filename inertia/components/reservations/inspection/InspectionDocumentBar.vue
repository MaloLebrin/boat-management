<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import InspectionSignModal from '~/components/reservations/inspection/InspectionSignModal.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { InspectionWithPhotos } from '~/types/inspection'

/**
 * Document de l'état des lieux (#889) : statut (brouillon ou signé), PDF,
 * signature sur place et envoi du PDF signé au client.
 */
const props = defineProps<{
  basePath: string
  inspection: InspectionWithPhotos
  clientName: string
  canEdit: boolean
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const signOpen = ref(false)
const sending = ref(false)

const inspectionPath = computed(() => `${props.basePath}/inspections/${props.inspection.id}`)
const locked = computed(() => props.inspection.lockedAt !== null)

const signers = computed(() =>
  props.inspection.signatures
    .map((signature) =>
      t('inspections.signature.signer', {
        role: t(`inspections.signature.roles.${signature.role}`),
        name: signature.signerName,
      })
    )
    .join(' · ')
)

function send() {
  router.post(
    `${inspectionPath.value}/send`,
    {},
    {
      preserveScroll: true,
      onStart: () => (sending.value = true),
      onFinish: () => (sending.value = false),
    }
  )
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-border bg-surface-muted p-4">
    <div class="space-y-1">
      <p v-if="locked" class="text-sm font-medium text-fg">
        {{ t('inspections.signature.signedOn', { date: formatDateTime(inspection.lockedAt!) }) }}
      </p>
      <p v-else class="text-sm text-fg-muted">{{ t('inspections.signature.draft') }}</p>
      <p v-if="locked && signers" class="text-xs text-fg-muted">{{ signers }}</p>
      <p v-if="inspection.sentAt" class="text-xs text-fg-subtle">
        {{ t('inspections.signature.sentOn', { date: formatDateTime(inspection.sentAt) }) }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :href="`${inspectionPath}/pdf?inline=1`"
        external-href
        target="_blank"
        rel="noopener"
      >
        {{ t(locked ? 'inspections.signature.pdfSigned' : 'inspections.signature.pdfDraft') }}
      </BaseButton>

      <BaseButton
        v-if="canEdit && !locked"
        variant="primary"
        size="sm"
        type="button"
        @click="signOpen = true"
      >
        {{ t('inspections.signature.sign') }}
      </BaseButton>

      <BaseButton
        v-if="canEdit && locked"
        variant="primary"
        size="sm"
        type="button"
        :disabled="sending"
        @click="send"
      >
        {{ t(inspection.sentAt ? 'inspections.signature.resend' : 'inspections.signature.send') }}
      </BaseButton>
    </div>

    <InspectionSignModal
      v-if="canEdit && !locked"
      v-model:open="signOpen"
      :sign-url="`${inspectionPath}/sign`"
      :client-name="clientName"
    />
  </div>
</template>
