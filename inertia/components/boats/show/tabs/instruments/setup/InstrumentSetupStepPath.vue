<script setup lang="ts">
import BaseOptionCard from '~/components/base/BaseOptionCard.vue'
import { useT } from '~/composables/use_t'
import type { InstrumentSetupPath } from '#shared/types/instruments'

defineProps<{ path: InstrumentSetupPath | null }>()
defineEmits<{ select: [value: InstrumentSetupPath] }>()

const { t } = useT()
const options: InstrumentSetupPath[] = ['plugin', 'app']
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2" data-testid="instrument-setup-path">
    <BaseOptionCard
      v-for="option in options"
      :key="option"
      :selected="path === option"
      class="p-4 text-left"
      :data-testid="`instrument-setup-path-${option}`"
      @click="$emit('select', option)"
    >
      <span class="block text-sm font-semibold">{{
        t(`instruments.setup.path.${option}.title`)
      }}</span>
      <span class="mt-1 block text-xs text-fg-muted">
        {{ t(`instruments.setup.path.${option}.desc`) }}
      </span>
      <span class="mt-2 block text-xs text-fg-subtle">
        {{ t(`instruments.setup.path.${option}.limit`) }}
      </span>
    </BaseOptionCard>
  </div>
</template>
