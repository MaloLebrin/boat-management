<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { ConflictState } from '~/composables/use_offline_queue'

const props = defineProps<{ conflict: ConflictState }>()
const emit = defineEmits<{ resolve: [choice: 'local' | 'server'] }>()
const { t } = useT()

const FIELDS_BY_TYPE: Record<string, string[]> = {
  'update-navigation-log': ['windForceBeaufort', 'seaState', 'crewCount', 'notes'],
  'close-navigation-log': [
    'arrivedAt',
    'arrivalPortName',
    'distanceNm',
    'engineHoursEnd',
    'fuelConsumedLiters',
    'windForceBeaufort',
    'seaState',
    'crewCount',
    'notes',
  ],
}

const rows = computed(() => {
  const keys = FIELDS_BY_TYPE[props.conflict.action.type] ?? []
  return keys
    .map((key) => {
      const local = props.conflict.action.payload[key]
      const server = props.conflict.serverData[key]
      return {
        key,
        label: t(`navigationLog.field.${key}`),
        local: local ?? null,
        server: server ?? null,
        differs: String(local ?? '') !== String(server ?? ''),
      }
    })
    .filter((r) => r.local !== null || r.server !== null)
})

function fmt(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  return String(val)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-navy-900">{{ t('offline.conflict.title') }}</h2>
          <p class="mt-1 text-sm text-gray-500">{{ t('offline.conflict.description') }}</p>
        </div>

        <!-- Comparison grid -->
        <div class="overflow-y-auto flex-1 px-6 py-4">
          <div class="grid grid-cols-[auto_1fr_1fr] gap-x-4 text-sm">
            <div class="pb-2 font-medium text-gray-400 text-xs uppercase tracking-wide"></div>
            <div class="pb-2 font-semibold text-amber-600 text-xs uppercase tracking-wide">
              {{ t('offline.conflict.localVersion') }}
            </div>
            <div class="pb-2 font-semibold text-blue-600 text-xs uppercase tracking-wide">
              {{ t('offline.conflict.serverVersion') }}
            </div>

            <template v-for="row in rows" :key="row.key">
              <div
                class="py-2 pr-4 font-medium text-gray-700 border-t border-gray-100 whitespace-nowrap"
              >
                {{ row.label }}
              </div>
              <div
                class="py-2 pr-4 border-t border-gray-100 break-words"
                :class="row.differs ? 'text-amber-700 font-medium' : 'text-gray-600'"
              >
                {{ fmt(row.local) }}
              </div>
              <div
                class="py-2 border-t border-gray-100 break-words"
                :class="row.differs ? 'text-blue-700 font-medium' : 'text-gray-600'"
              >
                {{ fmt(row.server) }}
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <BaseButton variant="secondary" @click="emit('resolve', 'server')">
            {{ t('offline.conflict.keepServer') }}
          </BaseButton>
          <BaseButton variant="primary" @click="emit('resolve', 'local')">
            {{ t('offline.conflict.keepLocal') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
