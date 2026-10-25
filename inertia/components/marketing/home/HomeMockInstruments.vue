<script setup lang="ts">
import { useT } from '~/composables/use_t'

/**
 * Maquette de l'onglet Instruments (#995) : valeurs **simulées**, comme les
 * autres `HomeMock*`. Les nombres restent entiers pour ne dépendre d'aucune
 * locale ; seuls libellés et unités passent par `homePreview.mock.instruments.*`.
 */
const { t } = useT()

const levels = [
  { key: 'voltage', value: 86, unit: '%', bar: 'bg-mint-600' },
  { key: 'tank', value: 62, unit: '%', bar: 'bg-sky-300' },
] as const
</script>

<template>
  <div
    class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-cream"
    style="font-size: 10px"
  >
    <div
      class="flex items-center justify-between border-b border-bone bg-surface-elevated px-4 py-2"
    >
      <p class="font-semibold text-fg">{{ t('homePreview.mock.instruments.title') }}</p>
      <span
        class="flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[9px] font-medium text-mint-700"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-mint-600" aria-hidden="true" />
        {{ t('homePreview.mock.instruments.live') }}
      </span>
    </div>

    <div class="flex-1 overflow-hidden p-3">
      <div
        class="mb-3 flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-amber-700"
        data-testid="mock-instruments-alert"
      >
        <span class="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
        <span class="font-medium">{{ t('homePreview.mock.instruments.alert') }}</span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-bone bg-surface-elevated p-2">
          <p class="text-fg-muted">{{ t('homePreview.mock.instruments.rpm') }}</p>
          <p class="mt-1 font-display text-lg text-fg">2450</p>
          <p class="text-fg-subtle">{{ t('homePreview.mock.instruments.rpmUnit') }}</p>
        </div>
        <div class="rounded-lg border border-bone bg-surface-elevated p-2">
          <p class="text-fg-muted">{{ t('homePreview.mock.instruments.engineHours') }}</p>
          <p class="mt-1 font-display text-lg text-fg">1284</p>
          <p class="text-fg-subtle">h</p>
        </div>
        <div class="rounded-lg border border-bone bg-surface-elevated p-2">
          <p class="text-fg-muted">{{ t('homePreview.mock.instruments.depth') }}</p>
          <p class="mt-1 font-display text-lg text-fg">7</p>
          <p class="text-fg-subtle">m</p>
        </div>
        <div class="rounded-lg border border-bone bg-surface-elevated p-2">
          <p class="text-fg-muted">{{ t('homePreview.mock.instruments.wind') }}</p>
          <p class="mt-1 font-display text-lg text-fg">14</p>
          <p class="text-fg-subtle">{{ t('homePreview.mock.instruments.windUnit') }}</p>
        </div>
        <div
          v-for="level in levels"
          :key="level.key"
          class="rounded-lg border border-bone bg-surface-elevated p-2"
        >
          <p class="text-fg-muted">{{ t(`homePreview.mock.instruments.${level.key}`) }}</p>
          <p class="mt-1 font-display text-lg text-fg">{{ level.value }}</p>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="h-full rounded-full"
              :class="level.bar"
              :style="{ width: `${level.value}%` }"
            />
          </div>
        </div>
      </div>

      <p class="mt-3 text-right text-fg-subtle">{{ t('homePreview.mock.instruments.synced') }}</p>
    </div>
  </div>
</template>
