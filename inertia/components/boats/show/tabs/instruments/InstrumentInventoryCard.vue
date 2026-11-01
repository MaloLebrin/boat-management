<script setup lang="ts">
import { computed } from 'vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useT } from '~/composables/use_t'
import { groupInstrumentDevices, instrumentSeenAgo } from '#shared/helpers/instrument_inventory'
import type { InstrumentDevice } from '#shared/types/instruments'

const props = defineProps<{
  devices: InstrumentDevice[]
  /** Horloge de la page (ms), pour que « vu il y a » avance avec elle. */
  now: number
}>()

const { t } = useT()

const groups = computed(() => groupInstrumentDevices(props.devices))

function seen(device: InstrumentDevice): string {
  const { unit, count } = instrumentSeenAgo(device.lastSeenAt, props.now)
  return unit === 'now'
    ? t('instruments.inventory.seenNow')
    : t(`instruments.inventory.seen.${unit}`, { count: String(count) })
}

function name(device: InstrumentDevice): string {
  const parts = [device.manufacturer, device.model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : device.label
}
</script>

<template>
  <section class="space-y-4" data-testid="instrument-inventory">
    <div>
      <h2 class="font-display text-lg font-semibold text-fg">
        {{ t('instruments.inventory.title') }}
      </h2>
      <p class="text-sm text-fg-muted">{{ t('instruments.inventory.subtitle') }}</p>
    </div>

    <BaseEmptyState
      v-if="devices.length === 0"
      :title="t('instruments.inventory.empty.title')"
      :description="t('instruments.inventory.empty.causes')"
      data-testid="instrument-inventory-empty"
    />

    <div
      v-for="entry in groups"
      v-else
      :key="entry.group"
      :data-testid="`instrument-inventory-group-${entry.group}`"
    >
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t(`instruments.inventory.group.${entry.group}`) }}
      </h3>
      <ul
        class="divide-y divide-border rounded-(--radius-card) border border-border bg-surface-elevated"
      >
        <li
          v-for="device in entry.devices"
          :key="device.id"
          class="p-4"
          :data-testid="`instrument-device-${device.deviceId}`"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-sm font-semibold text-fg">{{ name(device) }}</p>
            <p
              class="text-xs"
              :class="device.goneAt ? 'text-warning' : 'text-fg-muted'"
              data-testid="instrument-device-seen"
            >
              {{ device.goneAt ? t('instruments.inventory.gone') + ' · ' : '' }}{{ seen(device) }}
            </p>
          </div>
          <p v-if="device.manufacturer || device.model" class="text-xs text-fg-muted">
            {{ device.label }}
          </p>
          <details v-if="device.paths.length > 0" class="mt-2">
            <summary class="cursor-pointer text-xs font-medium text-brand">
              {{ t('instruments.inventory.paths', { count: String(device.paths.length) }) }}
            </summary>
            <ul class="mt-1 space-y-0.5 font-mono text-xs text-fg-muted">
              <li v-for="path in device.paths" :key="path">{{ path }}</li>
            </ul>
          </details>
        </li>
      </ul>
    </div>
  </section>
</template>
