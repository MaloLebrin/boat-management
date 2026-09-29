<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import SignaturePad from '~/components/reservations/inspection/SignaturePad.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useT } from '~/composables/use_t'

/**
 * Signature sur place de l'état des lieux (#889) : le client puis l'agent
 * signent sur l'écran. Signer fige l'inspection — le texte le dit avant.
 * En ligne seulement : le PDF signé est produit et archivé par le serveur.
 */
const props = defineProps<{
  signUrl: string
  clientName: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()

const form = useForm({
  clientName: props.clientName,
  clientSignature: null as string | null,
  staffSignature: null as string | null,
})

watch(
  () => props.open,
  (open) => {
    if (open) form.clientName = props.clientName
  }
)

const ready = computed(
  () =>
    isOnline.value &&
    form.clientName.trim().length >= 2 &&
    form.clientSignature !== null &&
    form.staffSignature !== null
)

function submit() {
  if (!ready.value) return
  form.post(props.signUrl, { preserveScroll: true, onSuccess: () => close() })
}

function close() {
  form.reset()
  form.clearErrors()
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('inspections.signature.modalTitle')"
    size="lg"
    @update:open="close"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p
        v-if="!isOnline"
        class="rounded-md border border-warning/40 bg-surface-muted px-3 py-2 text-sm text-fg"
        role="alert"
      >
        {{ t('inspections.signature.offline') }}
      </p>

      <p class="text-sm text-fg-muted">{{ t('inspections.signature.statement') }}</p>

      <BaseInput
        id="inspection-signer-name"
        v-model="form.clientName"
        name="clientName"
        :label="t('inspections.signature.clientName')"
        :error="form.errors.clientName"
        required
      />

      <SignaturePad
        id="inspection-signature-client"
        v-model="form.clientSignature"
        :label="t('inspections.signature.roles.client')"
        :error="form.errors.clientSignature"
        :disabled="form.processing"
      />

      <SignaturePad
        id="inspection-signature-staff"
        v-model="form.staffSignature"
        :label="t('inspections.signature.roles.staff')"
        :hint="t('inspections.signature.staffHint')"
        :error="form.errors.staffSignature"
        :disabled="form.processing"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('inspections.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="!ready || form.processing">
          {{ t('inspections.signature.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
