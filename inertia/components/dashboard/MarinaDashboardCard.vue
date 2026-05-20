<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'

type PortItem = {
  id: number
  name: string
  city: string | null
  country: string | null
  boatCount: number
  totalSpots: number
  freeSpots: number
}

type PortStats = {
  total: number
  totalBoats: number
  totalFreeSpots: number
}

const props = defineProps<{
  ports: PortItem[]
  portStats: PortStats
}>()

const { t } = useT()

const displayedPorts = computed(() => props.ports.slice(0, 5))

function fillRate(port: PortItem): number {
  if (port.totalSpots === 0) return 0
  return Math.round((port.boatCount / port.totalSpots) * 100)
}

function fillRateColor(rate: number): string {
  if (rate >= 90) return 'bg-danger'
  if (rate >= 70) return 'bg-amber-500'
  return 'bg-brand'
}

function locationLabel(port: PortItem): string {
  return [port.city, port.country].filter(Boolean).join(', ')
}
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.marina.title') }}</h2>
        <a href="/ports" class="text-sm font-semibold text-brand hover:underline">
          {{ t('dashboard.marina.viewAll') }}
        </a>
      </div>
    </template>

    <div v-if="ports.length === 0" class="flex flex-col items-center gap-3 py-6 text-center">
      <p class="text-sm text-fg-muted">{{ t('dashboard.marina.empty') }}</p>
      <a
        href="/ports/new"
        class="text-sm font-semibold text-brand hover:underline"
      >
        {{ t('dashboard.marina.addMarina') }}
      </a>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap gap-4 text-xs text-fg-muted">
        <span>{{ t('dashboard.marina.totalMarinas', { count: String(portStats.total) }) }}</span>
        <span>·</span>
        <span>{{ t('dashboard.marina.totalBoats', { count: String(portStats.totalBoats) }) }}</span>
        <span>·</span>
        <span>{{ t('dashboard.marina.totalFreeSpots', { count: String(portStats.totalFreeSpots) }) }}</span>
      </div>

      <ul class="space-y-4">
        <li
          v-for="port in displayedPorts"
          :key="port.id"
          class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <a
                :href="`/ports/${port.id}`"
                class="block truncate text-sm font-semibold text-fg hover:underline"
              >
                {{ port.name }}
              </a>
              <p v-if="locationLabel(port)" class="mt-0.5 truncate text-xs text-fg-muted">
                {{ locationLabel(port) }}
              </p>
            </div>
            <span
              v-if="port.totalSpots > 0"
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="
                port.freeSpots === 0
                  ? 'bg-danger/10 text-danger ring-1 ring-danger/20'
                  : 'bg-brand/10 text-brand ring-1 ring-brand/20'
              "
            >
              {{ t('dashboard.marina.freeSpots', { free: String(port.freeSpots), total: String(port.totalSpots) }) }}
            </span>
            <span v-else class="shrink-0 text-xs text-fg-subtle">
              {{ t('dashboard.marina.noSpots') }}
            </span>
          </div>

          <div v-if="port.totalSpots > 0" class="mt-2">
            <div class="flex items-center justify-between text-xs text-fg-muted">
              <span>{{ t('dashboard.marina.fillRate', { rate: String(fillRate(port)) }) }}</span>
            </div>
            <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                class="h-full rounded-full transition-all"
                :class="fillRateColor(fillRate(port))"
                :style="{ width: `${fillRate(port)}%` }"
              />
            </div>
          </div>
        </li>
      </ul>
    </template>
  </BaseCard>
</template>
