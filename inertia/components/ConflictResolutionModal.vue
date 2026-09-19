<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import type { ConflictState } from '~/composables/use_offline_queue'
import {
  CLOSE_NAVIGATION_LOG_ACTION,
  UPDATE_INSPECTION_ACTION,
  UPDATE_NAVIGATION_LOG_ACTION,
  UPDATE_NAVIGATION_LOG_ENTRY_ACTION,
  UPDATE_SHEET_ITEM_ACTION,
  type OfflineActionType,
} from '#shared/constants/offline_queue'

const props = defineProps<{ conflict: ConflictState }>()
const emit = defineEmits<{ resolve: [choice: 'local' | 'server'] }>()
const { t } = useT()

// Les clés viennent de `shared/constants/offline_queue.ts` (#726) : le même
// identifiant que le contrôleur flashe et que le formulaire enfile, donc un
// renommage casse ici à la compilation au lieu d'ouvrir une modale vide.
const FIELDS_BY_TYPE: Partial<Record<OfflineActionType, string[]>> = {
  [UPDATE_NAVIGATION_LOG_ACTION]: ['windForceBeaufort', 'seaState', 'crewCount', 'notes'],
  [CLOSE_NAVIGATION_LOG_ACTION]: [
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
  [UPDATE_NAVIGATION_LOG_ENTRY_ACTION]: [
    'recordedAt',
    'latitude',
    'longitude',
    'cogDeg',
    'sogKn',
    'sailConfig',
    'note',
  ],
  [UPDATE_SHEET_ITEM_ACTION]: ['isDone', 'notes'],
  [UPDATE_INSPECTION_ACTION]: ['performedAt', 'fuelLevel', 'engineHours', 'notes'],
}

// Chaque type d'action a son propre namespace de libellés de champs
const LABEL_PREFIX_BY_TYPE: Partial<Record<OfflineActionType, string>> = {
  [UPDATE_SHEET_ITEM_ACTION]: 'common.sheetItem.field',
  [UPDATE_INSPECTION_ACTION]: 'inspections.fields',
}

// La description parle de « cette sortie » : un état des lieux a la sienne (#622).
const DESCRIPTION_BY_TYPE: Partial<Record<OfflineActionType, string>> = {
  [UPDATE_INSPECTION_ACTION]: 'common.offline.conflict.descriptionInspection',
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
  <!-- `dismissible: false` (#734) : l'écran de conflit met la file de synchro en
       pause, il ne se referme que par « garder mes modifications » ou « utiliser
       la version serveur ». `BaseModal` porte `role="dialog"`, `aria-modal` et le
       nom accessible : un lecteur d'écran annonce enfin qu'une décision attend. -->
  <BaseModal
    :open="true"
    :title="t('common.offline.conflict.title')"
    :subtitle="description"
    :dismissible="false"
    size="2xl"
  >
    <div class="grid grid-cols-[auto_1fr_1fr] gap-x-4 text-sm">
      <div class="pb-2 font-medium text-fg-subtle text-xs uppercase tracking-wide"></div>
      <div class="pb-2 font-semibold text-warning text-xs uppercase tracking-wide">
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

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" @click="emit('resolve', 'server')">
          {{ t('common.offline.conflict.keepServer') }}
        </BaseButton>
        <BaseButton variant="primary" @click="emit('resolve', 'local')">
          {{ t('common.offline.conflict.keepLocal') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
