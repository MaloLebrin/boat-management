<script setup lang="ts">
import BaseOptionCard from '~/components/base/BaseOptionCard.vue'
import { useT } from '~/composables/use_t'
import { toAppLocale } from '#shared/helpers/locale_path'
import { installSignalKPath } from '~/lib/signalk/install_page'
import type { InstrumentSetupHardware } from '#shared/types/instruments'

defineProps<{ hardware: InstrumentSetupHardware | null }>()
defineEmits<{ select: [value: InstrumentSetupHardware] }>()

const { t, locale } = useT()
const options: InstrumentSetupHardware[] = ['none', 'cerbo', 'signalk']
</script>

<template>
  <div class="space-y-4" data-testid="instrument-setup-hardware">
    <p class="text-sm text-fg-muted">{{ t('instruments.setup.hardware.intro') }}</p>
    <div class="grid gap-3 sm:grid-cols-3">
      <BaseOptionCard
        v-for="option in options"
        :key="option"
        :selected="hardware === option"
        class="p-4 text-left"
        :data-testid="`instrument-setup-hardware-${option}`"
        @click="$emit('select', option)"
      >
        <span class="block text-sm font-semibold">
          {{ t(`instruments.setup.hardware.${option}.title`) }}
        </span>
        <span class="mt-1 block text-xs text-fg-muted">
          {{ t(`instruments.setup.hardware.${option}.desc`) }}
        </span>
      </BaseOptionCard>
    </div>
    <!-- eslint-disable vue/no-restricted-v-bind -- page publique localisée : nouvel onglet pour ne pas quitter l'assistant -->
    <a
      :href="installSignalKPath(toAppLocale(locale), 'kits')"
      target="_blank"
      rel="noopener"
      class="text-sm font-medium text-brand underline"
    >
      {{ t('instruments.setup.hardware.guide') }}
    </a>
    <!-- eslint-enable vue/no-restricted-v-bind -->
  </div>
</template>
