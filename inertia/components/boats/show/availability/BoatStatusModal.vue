<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { BOAT_STATUSES } from '#shared/types/boat_status'
import type { BoatStatus, BoatStatusChangeRow } from '#shared/types/boat_status'

const props = defineProps<{
  boatId: number
  currentStatus: BoatStatus
  history: BoatStatusChangeRow[]
  open: boolean
}>()

const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const form = useForm({
  status: props.currentStatus,
  reason: '',
})

// Chaque ouverture repart du statut courant, sans motif.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.clearErrors()
    form.status = props.currentStatus
    form.reason = ''
  }
)

const statusOptions = computed(() =>
  BOAT_STATUSES.map((value) => ({ value, label: t(`boats.availability.status.${value}`) }))
)

function close() {
  emit('update:open', false)
}

function submit() {
  form
    .transform((data) => ({ status: data.status, reason: data.reason.trim() || null }))
    .patch(`/boats/${props.boatId}/status`, {
      preserveScroll: true,
      onSuccess: () => close(),
    })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('boats.availability.modal.title')"
    :close-label="t('common.close')"
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseField :label="t('boats.availability.modal.status')" :error="form.errors.status">
        <BaseSelect
          v-model="form.status"
          :options="statusOptions"
          data-testid="boat-status-select"
        />
      </BaseField>
      <p v-if="form.status === 'sold'" class="text-xs text-fg-muted">
        {{ t('boats.availability.modal.soldHint') }}
      </p>
      <p v-else-if="form.status !== 'available'" class="text-xs text-fg-muted">
        {{ t('boats.availability.modal.immobilizedHint') }}
      </p>
      <BaseField :label="t('boats.availability.modal.reason')" :error="form.errors.reason">
        <BaseTextarea
          v-model="form.reason"
          :rows="3"
          :placeholder="t('boats.availability.modal.reasonPlaceholder')"
        />
      </BaseField>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="ghost" @click="close">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing || form.status === currentStatus">
          {{ t('boats.availability.modal.submit') }}
        </BaseButton>
      </div>
    </form>

    <section v-if="history.length > 0" class="mt-6 border-t border-border pt-4">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('boats.availability.history.title') }}
      </h3>
      <ol class="mt-2 space-y-2 text-sm" data-testid="boat-status-history">
        <li v-for="entry in history" :key="entry.id">
          <p class="font-semibold text-fg">
            {{
              t('boats.availability.history.entry', {
                from: t(`boats.availability.status.${entry.fromStatus}`),
                to: t(`boats.availability.status.${entry.toStatus}`),
              })
            }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ formatDateTime(entry.createdAt) }}
            <template v-if="entry.userName">
              · {{ t('boats.availability.history.by', { name: entry.userName }) }}
            </template>
          </p>
          <p v-if="entry.reason" class="text-xs text-fg-muted">{{ entry.reason }}</p>
        </li>
      </ol>
    </section>
  </BaseModal>
</template>
