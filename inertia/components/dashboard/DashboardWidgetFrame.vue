<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon, MinusIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import { useT } from '~/composables/use_t'

/**
 * Cadre d'un widget en mode édition (façon iOS) : le contenu devient
 * **inerte** (ni clic, ni focus, ni lecteur d'écran — `inert`, doublé de
 * `pointer-events-none` pour les navigateurs plus anciens), un badge « − »
 * le retire, deux flèches le déplacent dans sa colonne. Hors édition, le
 * slot est rendu nu : aucun changement de DOM pour le mode normal.
 */
const props = defineProps<{
  id: DashboardWidgetId
  editing: boolean
  /** Zone `top` (KPI) : retrait possible, pas de flèches. */
  reorderable: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

const { t } = useT()

const label = computed(() => t(`dashboard.widgets.${props.id}`))
</script>

<template>
  <div
    v-if="editing"
    class="relative"
    role="group"
    :aria-label="t('dashboard.customize.frameLabel', { widget: label })"
    data-testid="dashboard-widget-frame"
    :data-widget="id"
  >
    <div
      inert
      class="dashboard-editing pointer-events-none select-none rounded-(--radius-card) opacity-90 ring-2 ring-brand/30 ring-offset-2 ring-offset-surface"
      data-testid="dashboard-widget-content"
    >
      <slot />
    </div>

    <button
      type="button"
      class="absolute -left-3 -top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-danger-soft text-danger-strong shadow-(--shadow-card) transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:before:absolute pointer-coarse:before:content-[''] pointer-coarse:before:-inset-2"
      :aria-label="t('dashboard.customize.remove', { widget: label })"
      data-testid="dashboard-widget-remove"
      @click="emit('remove')"
    >
      <MinusIcon class="h-4 w-4" aria-hidden="true" />
    </button>

    <div v-if="reorderable" class="absolute -top-3 right-2 z-10 flex items-center gap-1">
      <BaseButton
        variant="secondary"
        size="icon"
        :disabled="!canMoveUp"
        :aria-label="t('dashboard.customize.moveUp', { widget: label })"
        data-testid="dashboard-widget-up"
        @click="emit('move-up')"
      >
        <ChevronUpIcon class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="icon"
        :disabled="!canMoveDown"
        :aria-label="t('dashboard.customize.moveDown', { widget: label })"
        data-testid="dashboard-widget-down"
        @click="emit('move-down')"
      >
        <ChevronDownIcon class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
    </div>
  </div>
  <slot v-else />
</template>
