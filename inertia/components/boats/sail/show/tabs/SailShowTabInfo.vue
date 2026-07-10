<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatSailDetail } from '~/types/boat_show'

defineProps<{ sail: BoatSailDetail }>()

const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.sailShow.fields.sailType') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ t(`boats.options.sailType.${sail.sailType}`) }}</dd>
      </div>
      <div v-if="sail.areaM2 !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.sailShow.fields.areaM2') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ sail.areaM2 }}</dd>
      </div>
      <div v-if="sail.material">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.sailShow.fields.material') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ sail.material }}</dd>
      </div>
      <div v-if="sail.reefPoints !== null">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.sailShow.fields.reefPoints') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ sail.reefPoints }}</dd>
      </div>
      <div v-if="sail.manufacturedAt">
        <dt class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.sailShow.fields.manufacturedAt') }}
        </dt>
        <dd class="mt-1 text-sm text-fg">{{ sail.manufacturedAt }}</dd>
      </div>
    </dl>

    <div v-if="sail.notes" class="mt-6 border-t border-border pt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('equipment.notes') }}
      </p>
      <p class="mt-1 whitespace-pre-line text-sm text-fg-muted">{{ sail.notes }}</p>
    </div>
  </BaseCard>
</template>
