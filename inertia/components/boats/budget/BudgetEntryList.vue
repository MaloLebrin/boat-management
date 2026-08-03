<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm, router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatBudgetEntryItem } from '#shared/types/budget'

const props = defineProps<{
  boatId: number
  entries: BoatBudgetEntryItem[]
  canManage: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const editingId = ref<number | null>(null)
const editForm = useForm({
  label: '',
  amount: '',
  date: '',
  category: '',
  description: '',
})

const categoryOptions = computed(() => [
  { value: '', label: '' },
  { value: 'maintenance', label: t('budget.entries.categories.maintenance') },
  { value: 'fuel', label: t('budget.entries.categories.fuel') },
  { value: 'documents', label: t('budget.entries.categories.documents') },
  { value: 'port', label: t('budget.entries.categories.port') },
  { value: 'equipment', label: t('budget.entries.categories.equipment') },
  { value: 'other', label: t('budget.entries.categories.other') },
])

function startEdit(entry: BoatBudgetEntryItem) {
  editingId.value = entry.id
  editForm.label = entry.label
  editForm.amount = String(entry.amount)
  editForm.date = entry.date
  editForm.category = entry.category
  editForm.description = entry.description ?? ''
}

function cancelEdit() {
  editingId.value = null
  editForm.reset()
}

function submitEdit(entryId: number) {
  editForm.patch(`/boats/${props.boatId}/budget/entries/${entryId}`, {
    preserveScroll: true,
    onSuccess: () => {
      editingId.value = null
      editForm.reset()
    },
  })
}

function deleteEntry(entryId: number) {
  if (!confirm(t('budget.entries.deleteConfirm'))) return
  router.delete(`/boats/${props.boatId}/budget/entries/${entryId}`, {
    preserveScroll: true,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function getCategoryLabel(category: string): string {
  return t(`budget.entries.categories.${category}`)
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: 'bg-amber-100 text-amber-700',
  fuel: 'bg-sky-100 text-sky-800',
  documents: 'bg-violet-100 text-violet-700',
  port: 'bg-lilac-100 text-lilac-800',
  equipment: 'bg-mint-100 text-mint-700',
  other: 'bg-surface-muted text-fg-muted',
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.entries.listTitle') }}</h3>
    <div v-if="entries.length === 0" class="text-sm text-fg-subtle text-center py-6">
      {{ t('budget.entries.noEntries') }}
    </div>
    <ul v-else class="divide-y divide-border">
      <li v-for="entry in entries" :key="entry.id" class="py-3">
        <template v-if="editingId === entry.id">
          <p class="text-sm font-semibold text-fg mb-3">{{ t('budget.entries.editTitle') }}</p>
          <form
            class="grid grid-cols-1 gap-3 sm:grid-cols-2"
            @submit.prevent="submitEdit(entry.id)"
          >
            <BaseInput
              v-model="editForm.label"
              :label="t('budget.entries.label')"
              :error="editForm.errors.label"
              required
            />
            <BaseInput
              v-model="editForm.amount"
              type="number"
              step="0.01"
              min="0"
              :label="t('budget.entries.amount')"
              :error="editForm.errors.amount"
              required
            />
            <BaseInput
              v-model="editForm.date"
              type="date"
              :label="t('budget.entries.date')"
              :error="editForm.errors.date"
              required
            />
            <BaseSelect
              v-model="editForm.category"
              :label="t('budget.entries.category')"
              :options="categoryOptions"
              :error="editForm.errors.category"
            />
            <div class="sm:col-span-2">
              <BaseInput
                v-model="editForm.description"
                :label="t('budget.entries.description')"
                :error="editForm.errors.description"
              />
            </div>
            <div class="sm:col-span-2 flex justify-end gap-2">
              <BaseButton variant="secondary" size="sm" type="button" @click="cancelEdit">
                {{ t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" size="sm" :loading="editForm.processing">
                {{ t('budget.entries.updateSubmit') }}
              </BaseButton>
            </div>
          </form>
        </template>
        <template v-else>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-medium text-fg truncate">{{ entry.label }}</p>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other"
                >
                  {{ getCategoryLabel(entry.category) }}
                </span>
              </div>
              <p class="text-sm text-fg-muted">{{ formatDate(entry.date) }}</p>
              <p v-if="entry.description" class="text-sm text-fg-subtle mt-1 line-clamp-2">
                {{ entry.description }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-semibold text-peach-700">
                {{ formatCurrency(entry.amount) }}
              </span>
              <template v-if="canManage">
                <BaseButton variant="secondary" size="sm" @click="startEdit(entry)">
                  {{ t('common.edit') }}
                </BaseButton>
                <BaseButton variant="danger" size="sm" @click="deleteEntry(entry.id)">
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
