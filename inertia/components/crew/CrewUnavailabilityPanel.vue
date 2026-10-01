<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { confirmDelete } from '~/utils/native_dialog'
import type { CrewUnavailabilityRow } from '#shared/types/crew'

/**
 * Indisponibilités d'un équipier (#883) — congés, autre embarquement. Une
 * affectation qui en recoupe une est refusée.
 */
const props = defineProps<{
  memberId: number
  unavailabilities: CrewUnavailabilityRow[]
  canUpdate: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const form = useForm({ startsOn: '', endsOn: '', reason: '' })

function submit() {
  form.post(`/crew/${props.memberId}/unavailabilities`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}

function remove(row: CrewUnavailabilityRow) {
  confirmDelete(
    t('crew.planning.unavailability.deleteConfirm'),
    `/crew/${props.memberId}/unavailabilities/${row.id}`,
    { preserveScroll: true }
  )
}
</script>

<template>
  <div class="space-y-4">
    <ul
      v-if="unavailabilities.length > 0"
      class="divide-y divide-border"
      data-testid="crew-unavailabilities"
    >
      <li
        v-for="row in unavailabilities"
        :key="row.id"
        class="flex items-center justify-between gap-4 py-2"
      >
        <div class="text-sm">
          <p class="font-medium text-fg">
            {{
              t('crew.planning.unavailability.range', {
                from: formatDate(row.startsOn),
                to: formatDate(row.endsOn),
              })
            }}
          </p>
          <p v-if="row.reason" class="text-fg-muted">{{ row.reason }}</p>
        </div>
        <BaseButton v-if="canUpdate" type="button" variant="ghost" size="sm" @click="remove(row)">
          {{ t('crew.form.delete') }}
        </BaseButton>
      </li>
    </ul>
    <p v-else class="text-sm text-fg-muted">{{ t('crew.planning.unavailability.empty') }}</p>

    <form
      v-if="canUpdate"
      class="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-muted/30 p-4 sm:grid-cols-3"
      data-testid="crew-unavailability-form"
      @submit.prevent="submit"
    >
      <BaseField :label="t('crew.planning.unavailability.startsOn')" :error="form.errors.startsOn">
        <BaseInput v-model="form.startsOn" type="date" required />
      </BaseField>
      <BaseField :label="t('crew.planning.unavailability.endsOn')" :error="form.errors.endsOn">
        <BaseInput v-model="form.endsOn" type="date" required />
      </BaseField>
      <BaseField :label="t('crew.planning.unavailability.reason')" :error="form.errors.reason">
        <BaseInput v-model="form.reason" maxlength="255" />
      </BaseField>
      <div class="flex justify-end sm:col-span-3">
        <BaseButton type="submit" size="sm" :disabled="form.processing">
          {{ t('crew.planning.unavailability.add') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
