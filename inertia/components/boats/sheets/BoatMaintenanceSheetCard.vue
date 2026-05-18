<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatMaintenanceSheetItemList from '~/components/boats/sheets/BoatMaintenanceSheetItemList.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail, MaintenanceSheetRow } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  sheet: MaintenanceSheetRow
  canManage: boolean
}>()

const isExpanded = ref(false)

const typeBadgeVariant = computed(() => {
  const variants: Record<MaintenanceSheetRow['type'], 'neutral' | 'info' | 'success' | 'warning'> = {
    entretien: 'info',
    montage: 'neutral',
    hivernage: 'warning',
    dehivernage: 'success',
    atelier: 'neutral',
  }
  return variants[props.sheet.type]
})

const typeLabel = computed(() => {
  const labels: Record<MaintenanceSheetRow['type'], string> = {
    entretien: t('boats.sheets.typeEntretien'),
    montage: t('boats.sheets.typeMontage'),
    hivernage: t('boats.sheets.typeHivernage'),
    dehivernage: t('boats.sheets.typeDehivernage'),
    atelier: t('boats.sheets.typeAtelier'),
  }
  return labels[props.sheet.type]
})

const statusBadgeVariant = computed(() => {
  return props.sheet.status === 'completed' ? 'success' : 'info'
})

const statusLabel = computed(() => {
  return props.sheet.status === 'completed'
    ? t('boats.sheets.statusCompleted')
    : t('boats.sheets.statusInProgress')
})

const progressText = computed(() => {
  const done = props.sheet.items.filter((i) => i.isDone).length
  const total = props.sheet.items.length
  return t('boats.sheets.progress', { done: String(done), total: String(total) })
})

const formattedDate = computed(() => {
  if (!props.sheet.performedAt) return ''
  const date = new Date(props.sheet.performedAt)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

function confirmDelete() {
  if (window.confirm(t('boats.sheets.confirmDelete'))) {
    return true
  }
  return false
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3 p-4">
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold text-fg truncate">{{ sheet.title }}</h3>
          <BaseBadge :variant="typeBadgeVariant">{{ typeLabel }}</BaseBadge>
          <BaseBadge :variant="statusBadgeVariant">{{ statusLabel }}</BaseBadge>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
          <span>{{ formattedDate }}</span>
          <span v-if="sheet.items.length > 0">{{ progressText }}</span>
        </div>
        <p v-if="sheet.notes" class="mt-2 text-sm text-fg-muted">{{ sheet.notes }}</p>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          v-if="sheet.items.length > 0"
          variant="ghost"
          size="sm"
          type="button"
          @click="isExpanded = !isExpanded"
        >
          <component :is="isExpanded ? ChevronUpIcon : ChevronDownIcon" class="h-4 w-4" />
          {{ isExpanded ? t('boats.sheets.collapse') : t('boats.sheets.expand') }}
        </BaseButton>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="canManage" class="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 bg-surface-muted/30">
      <Form
        v-if="sheet.status === 'in_progress'"
        :action="{ url: `/boats/${boat.id}/maintenance-sheets/${sheet.id}/complete`, method: 'put' }"
        #default="{ processing }"
      >
        <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
          <CheckCircleIcon class="h-4 w-4" />
          {{ t('boats.sheets.markComplete') }}
        </BaseButton>
      </Form>

      <Form
        :action="{ url: `/boats/${boat.id}/maintenance-sheets/${sheet.id}`, method: 'delete' }"
        @submit="(e: Event) => { if (!confirmDelete()) e.preventDefault() }"
        #default="{ processing }"
      >
        <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
          <TrashIcon class="h-4 w-4" />
          {{ t('common.delete') }}
        </BaseButton>
      </Form>
    </div>

    <!-- Items list (expanded) -->
    <div v-if="isExpanded && sheet.items.length > 0" class="border-t border-border p-4">
      <BoatMaintenanceSheetItemList
        :boat="boat"
        :sheet="sheet"
        :items="sheet.items"
        :can-manage="canManage"
      />
    </div>
  </div>
</template>
