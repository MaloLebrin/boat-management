<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import type { BoatRigDetail } from '~/types/boat_show'

defineProps<{ rig: BoatRigDetail }>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <BaseCard padded>
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.rigShow.fields.rigType') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ t(`boats.options.rigType.${rig.rigType}`) }}</dd>
      </div>
      <div v-if="rig.mastCount !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.rigShow.fields.mastCount') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ rig.mastCount }}</dd>
      </div>
      <div v-if="rig.spreaders !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.rigShow.fields.spreaders') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ rig.spreaders }}</dd>
      </div>
      <div v-if="rig.manufacturedAt">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.rigShow.fields.manufacturedAt') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ formatDate(rig.manufacturedAt) }}</dd>
      </div>
    </dl>

    <div v-if="rig.notes" class="mt-6 border-t border-border pt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('equipment.notes') }}
      </p>
      <p class="mt-1 whitespace-pre-line text-sm text-fg-muted">{{ rig.notes }}</p>
    </div>
  </BaseCard>
</template>
