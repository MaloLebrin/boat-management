<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { routes } from '~/utils/routes'
import type { CsvBoatOption } from '#shared/types/csv'

const { t } = useT()

const props = defineProps<{
  boats: CsvBoatOption[]
  boatOptions: { value: string; label: string }[]
  /** Flotte mono-bateau (#823) : le bateau est retenu d'office, sans sélecteur. */
  singleBoatId: string | null
  /** Bateau sélectionné, au format `BaseSelect` (chaîne). */
  modelValue: string
}>()

defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const exportLinks = [
  { key: 'maintenance', label: 'settings.import.exportMaintenance' },
  { key: 'fuelLogs', label: 'settings.import.exportFuelLogs' },
  { key: 'navigationLogs', label: 'settings.import.exportNavigationLogs' },
] as const

function getExportHref(key: (typeof exportLinks)[number]['key']) {
  if (!props.modelValue) return undefined
  const id = Number(props.modelValue)
  return key === 'maintenance'
    ? routes.csv.exportMaintenance(id)
    : key === 'fuelLogs'
      ? routes.csv.exportFuelLogs(id)
      : routes.csv.exportNavigationLogs(id)
}
</script>

<template>
  <BaseCard>
    <BaseHeading level="3" class="mb-4">{{ t('settings.import.exportSection') }}</BaseHeading>
    <div v-if="!singleBoatId" class="mb-4">
      <BaseSelect
        :model-value="modelValue"
        :label="t('settings.import.exportBoatLabel')"
        :options="boatOptions"
        allow-empty
        :placeholder="t('settings.import.boatPlaceholder')"
        @update:model-value="$emit('update:modelValue', String($event))"
      />
      <p v-if="boats.length === 0" class="mt-2 text-sm text-fg-muted">
        {{ t('settings.import.noBoats') }}
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <!-- eslint-disable vue/no-restricted-v-bind -- export CSV : pas une navigation -->
      <a
        v-for="{ key, label } in exportLinks"
        :key="key"
        :href="getExportHref(key)"
        :class="[
          'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors',
          modelValue ? 'text-fg hover:bg-surface-muted' : 'pointer-events-none opacity-40',
        ]"
      >
        {{ t(label) }}
      </a>
      <!-- eslint-enable vue/no-restricted-v-bind -->
    </div>
  </BaseCard>
</template>
