<script setup lang="ts">
import { computed } from 'vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { ConflictState } from '~/composables/use_offline_queue'
import { conflictRows } from '~/lib/conflict_fields'

const props = defineProps<{ conflict: ConflictState }>()
const { t } = useT()
const { formatDateTime } = useDateFormat()

const rows = computed(() => conflictRows(props.conflict, t, formatDateTime))
</script>

<template>
  <!-- Saisie locale face à la ligne du serveur, champ par champ : la
       différence se lit à la couleur (warning / info), sans légende. -->
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
        {{ row.local }}
      </div>
      <div
        class="py-2 border-t border-border break-words"
        :class="row.differs ? 'text-info font-medium' : 'text-fg-muted'"
      >
        {{ row.server }}
      </div>
    </template>
  </div>
</template>
