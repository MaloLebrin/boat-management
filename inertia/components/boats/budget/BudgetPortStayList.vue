<script setup lang="ts">
import { ref } from 'vue'
import { useForm, router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatPortStayItem } from '#shared/types/budget'

const props = defineProps<{
  boatId: number
  stays: BoatPortStayItem[]
  canManage: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const editingId = ref<number | null>(null)
const editForm = useForm({
  portName: '',
  startedAt: '',
  endedAt: '',
  cost: '',
  notes: '',
})

function startEdit(stay: BoatPortStayItem) {
  editingId.value = stay.id
  editForm.portName = stay.portName
  editForm.startedAt = stay.startedAt
  editForm.endedAt = stay.endedAt ?? ''
  editForm.cost = stay.cost ?? ''
  editForm.notes = stay.notes ?? ''
}

function cancelEdit() {
  editingId.value = null
  editForm.reset()
}

function submitEdit(stayId: number) {
  editForm.patch(`/boats/${props.boatId}/port-stays/${stayId}`, {
    preserveScroll: true,
    onSuccess: () => {
      editingId.value = null
      editForm.reset()
    },
  })
}

function deleteStay(stayId: number) {
  if (!confirm(t('budget.portStay.deleteConfirm'))) return
  router.delete(`/boats/${props.boatId}/port-stays/${stayId}`, {
    preserveScroll: true,
  })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.portStay.listTitle') }}</h3>
    <div v-if="stays.length === 0" class="text-sm text-fg-subtle text-center py-6">
      {{ t('budget.portStay.noStays') }}
    </div>
    <ul v-else class="divide-y divide-border">
      <li v-for="stay in stays" :key="stay.id" class="py-3">
        <template v-if="editingId === stay.id">
          <p class="text-sm font-semibold text-fg mb-3">{{ t('budget.portStay.editTitle') }}</p>
          <form class="grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="submitEdit(stay.id)">
            <BaseInput
              v-model="editForm.portName"
              :label="t('budget.portStay.portName')"
              :error="editForm.errors.portName"
              required
            />
            <BaseInput
              v-model="editForm.startedAt"
              type="date"
              :label="t('budget.portStay.startedAt')"
              :error="editForm.errors.startedAt"
              required
            />
            <BaseInput
              v-model="editForm.endedAt"
              type="date"
              :label="t('budget.portStay.endedAt')"
              :error="editForm.errors.endedAt"
            />
            <BaseInput
              v-model="editForm.cost"
              type="number"
              step="0.01"
              min="0"
              :label="t('budget.portStay.cost')"
              :error="editForm.errors.cost"
            />
            <div class="sm:col-span-2">
              <BaseInput
                v-model="editForm.notes"
                :label="t('budget.portStay.notes')"
                :error="editForm.errors.notes"
              />
            </div>
            <div class="sm:col-span-2 flex justify-end gap-2">
              <BaseButton variant="secondary" size="sm" type="button" @click="cancelEdit">
                {{ t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" size="sm" :loading="editForm.processing">
                {{ t('budget.portStay.updateSubmit') }}
              </BaseButton>
            </div>
          </form>
        </template>
        <template v-else>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-fg truncate">{{ stay.portName }}</p>
              <p class="text-sm text-fg-muted">
                {{ formatDate(stay.startedAt) }}
                <template v-if="stay.endedAt"> — {{ formatDate(stay.endedAt) }}</template>
              </p>
              <p v-if="stay.notes" class="text-sm text-fg-subtle mt-1 line-clamp-2">
                {{ stay.notes }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <span v-if="stay.cost" class="font-semibold text-teal-600 dark:text-teal-400">
                {{ formatCurrency(Number(stay.cost)) }}
              </span>
              <span v-else class="text-fg-subtle">—</span>
              <template v-if="canManage">
                <BaseButton variant="secondary" size="sm" @click="startEdit(stay)">
                  {{ t('common.edit') }}
                </BaseButton>
                <BaseButton variant="danger" size="sm" @click="deleteStay(stay.id)">
                  {{ t('common.delete') }}
                </BaseButton>
              </template>
            </div>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>
