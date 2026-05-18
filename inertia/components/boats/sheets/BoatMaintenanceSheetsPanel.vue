<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BoatMaintenanceSheetCard from '~/components/boats/sheets/BoatMaintenanceSheetCard.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail, MaintenanceSheetRow } from '~/types/boat_show'

type SheetType = 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  sheets: MaintenanceSheetRow[]
  canManage: boolean
}>()

const isCreateOpen = ref(false)
const typeFilter = ref<SheetType | 'all'>('all')

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const form = useForm({
  type: 'entretien' as SheetType,
  title: '',
  performedAt: todayIso.value,
  notes: '',
})

const typeOptions = computed(() => [
  { value: 'entretien', label: t('boats.sheets.typeEntretien') },
  { value: 'montage', label: t('boats.sheets.typeMontage') },
  { value: 'hivernage', label: t('boats.sheets.typeHivernage') },
  { value: 'dehivernage', label: t('boats.sheets.typeDehivernage') },
  { value: 'atelier', label: t('boats.sheets.typeAtelier') },
])

const filterOptions = computed(() => [
  { key: 'all', label: t('boats.sheets.filterAll') },
  { key: 'entretien', label: t('boats.sheets.typeEntretien') },
  { key: 'montage', label: t('boats.sheets.typeMontage') },
  { key: 'hivernage', label: t('boats.sheets.typeHivernage') },
  { key: 'dehivernage', label: t('boats.sheets.typeDehivernage') },
  { key: 'atelier', label: t('boats.sheets.typeAtelier') },
])

const filteredSheets = computed(() => {
  let result = props.sheets
  if (typeFilter.value !== 'all') {
    result = result.filter((s) => s.type === typeFilter.value)
  }
  return result.slice().sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)))
})

function handleSubmit() {
  form.post(`/boats/${props.boat.id}/maintenance-sheets`, {
    onSuccess: () => {
      isCreateOpen.value = false
      form.reset()
      form.performedAt = todayIso.value
    },
  })
}

function openCreateModal() {
  form.reset()
  form.performedAt = todayIso.value
  isCreateOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-fg">{{ t('boats.sheets.title') }}</h2>
        <p class="text-sm text-fg-muted">{{ t('boats.sheets.subtitle') }}</p>
      </div>
      <BaseButton v-if="canManage" variant="secondary" size="sm" type="button" @click="openCreateModal">
        <PlusIcon class="h-4 w-4" />
        {{ t('boats.sheets.addSheet') }}
      </BaseButton>
    </div>

    <!-- Type filters -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="filter in filterOptions"
        :key="filter.key"
        type="button"
        :class="[
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          typeFilter === filter.key
            ? 'bg-brand text-white'
            : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
        ]"
        @click="typeFilter = filter.key as SheetType | 'all'"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Sheets list -->
    <div v-if="filteredSheets.length === 0" class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center">
      <p class="text-fg-muted">{{ t('boats.sheets.empty') }}</p>
    </div>
    <div v-else class="space-y-4">
      <BoatMaintenanceSheetCard
        v-for="sheet in filteredSheets"
        :key="sheet.id"
        :boat="boat"
        :sheet="sheet"
        :can-manage="canManage"
      />
    </div>

    <!-- Create modal -->
    <BaseModal v-model:open="isCreateOpen" :title="t('boats.sheets.modalTitle')" :close-label="t('common.close')">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <BaseSelect
          id="sheet-type"
          name="type"
          :label="t('boats.sheets.typeLabel')"
          :options="typeOptions"
          v-model="form.type"
          :errors="form.errors"
        />

        <BaseInput
          id="sheet-title"
          name="title"
          :label="t('boats.sheets.titleLabel')"
          required
          :placeholder="t('boats.sheets.titlePlaceholder')"
          v-model="form.title"
          :errors="form.errors"
        />

        <BaseInput
          id="sheet-performed-at"
          name="performedAt"
          :label="t('boats.sheets.performedAtLabel')"
          type="date"
          required
          v-model="form.performedAt"
          :errors="form.errors"
        />

        <BaseTextarea
          id="sheet-notes"
          name="notes"
          :label="t('boats.sheets.notesLabel')"
          :rows="3"
          :placeholder="t('boats.sheets.notesPlaceholder')"
          v-model="form.notes"
          :errors="form.errors"
        />

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="form.processing">
            {{ t('boats.sheets.createSheet') }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
