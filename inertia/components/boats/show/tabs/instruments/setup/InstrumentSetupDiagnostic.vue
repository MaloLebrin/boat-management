<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'
import type { InstrumentProbeInventory, InstrumentProbeResult } from '#shared/types/instruments'

const props = defineProps<{ result: InstrumentProbeResult | null; testing: boolean }>()

const { t } = useT()

function engines(inventory: InstrumentProbeInventory): string {
  const text = t('instruments.setup.diagnostic.engines', { count: inventory.engineIds.length })
  return inventory.engineIds.length > 0 ? `${text} (${inventory.engineIds.join(', ')})` : text
}

const summary = computed(() => {
  const inventory = props.result?.ok ? props.result.inventory : null
  if (!inventory) return null
  return [
    t('instruments.setup.diagnostic.server', { version: inventory.serverVersion ?? '?' }),
    t('instruments.setup.diagnostic.vessel', {
      name: inventory.vesselName ?? t('instruments.setup.diagnostic.unnamed'),
    }),
    engines(inventory),
    t('instruments.setup.diagnostic.batteries', { count: inventory.batteryIds.length }),
    t('instruments.setup.diagnostic.tanks', { count: inventory.tankIds.length }),
    inventory.hasPosition
      ? t('instruments.setup.diagnostic.positionOk')
      : t('instruments.setup.diagnostic.positionMissing'),
  ].join(' · ')
})
</script>

<template>
  <div aria-live="polite" data-testid="instrument-setup-diagnostic">
    <p v-if="testing" class="text-sm text-fg-muted">
      {{ t('instruments.setup.diagnostic.testing') }}
    </p>
    <BaseAlert
      v-else-if="result && !result.ok"
      variant="danger"
      data-testid="instrument-setup-error"
    >
      <span class="block font-semibold">{{
        t(`instruments.setup.diagnostic.error.${result.error}.title`)
      }}</span>
      <span class="block">{{ t(`instruments.setup.diagnostic.error.${result.error}.fix`) }}</span>
    </BaseAlert>
    <BaseAlert v-else-if="summary" variant="success" data-testid="instrument-setup-success">
      {{ summary }}
    </BaseAlert>
  </div>
</template>
