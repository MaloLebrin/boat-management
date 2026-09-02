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
  'update-sheet-item': ['isDone', 'notes'],
  'update-inspection': ['performedAt', 'fuelLevel', 'engineHours', 'notes'],
}

// Chaque type d'action a son propre namespace de libellés de champs
const LABEL_PREFIX_BY_TYPE: Record<string, string> = {
  'update-sheet-item': 'common.sheetItem.field',
  'update-inspection': 'inspections.fields',
}

// La description parle de « cette sortie » : un état des lieux a la sienne (#622).
const DESCRIPTION_BY_TYPE: Record<string, string> = {
  'update-inspection': 'common.offline.conflict.descriptionInspection',
}

const rows = computed(() => {
  const keys = FIELDS_BY_TYPE[props.conflict.action.type] ?? []
  const labelPrefix =
    LABEL_PREFIX_BY_TYPE[props.conflict.action.type] ?? 'common.navigationLog.field'
  return keys
    .map((key) => {
      const local = props.conflict.action.payload[key]
      const server = props.conflict.serverData[key]
      return {
        key,
        label: t(`${labelPrefix}.${key}`),
        local: local ?? null,
        server: server ?? null,
        differs: String(local ?? '') !== String(server ?? ''),
      }
    })
    .filter((r) => r.local !== null || r.server !== null)
})

const description = computed(() =>
  t(DESCRIPTION_BY_TYPE[props.conflict.action.type] ?? 'common.offline.conflict.description')
)

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
      <div
        class="bg-surface-elevated rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-border">
          <h2 class="text-lg font-semibold text-fg">{{ t('common.offline.conflict.title') }}</h2>
          <p class="mt-1 text-sm text-fg-muted">{{ description }}</p>
        </div>

        <!-- Comparison grid -->
        <div class="overflow-y-auto flex-1 px-6 py-4">
          <div class="grid grid-cols-[auto_1fr_1fr] gap-x-4 text-sm">
            <div class="pb-2 font-medium text-fg-subtle text-xs uppercase tracking-wide"></div>
            <div class="pb-2 font-semibold text-amber-600 text-xs uppercase tracking-wide">
              {{ t('common.offline.conflict.localVersion') }}
            </div>
            <div class="pb-2 font-semibold text-info text-xs uppercase tracking-wide">
              {{ t('common.offline.conflict.serverVersion') }}
            </div>

            <template v-for="row in rows" :key="row.key">
              <div class="py-2 pr-4 font-medium text-fg border-t border-border whitespace-nowrap">
                {{ row.label }}
              </div>
              <div
                class="py-2 pr-4 border-t border-border break-words"
                :class="row.differs ? 'text-warning font-medium' : 'text-fg-muted'"
              >
                {{ fmt(row.local) }}
              </div>
              <div
                class="py-2 border-t border-border break-words"
                :class="row.differs ? 'text-info font-medium' : 'text-fg-muted'"
              >
                {{ fmt(row.server) }}
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-6 py-4 border-t border-border flex justify-end gap-3">
          <BaseButton variant="secondary" @click="emit('resolve', 'server')">
            {{ t('common.offline.conflict.keepServer') }}
          </BaseButton>
          <BaseButton variant="primary" @click="emit('resolve', 'local')">
            {{ t('common.offline.conflict.keepLocal') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
