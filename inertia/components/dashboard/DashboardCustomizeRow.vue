<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  id: DashboardWidgetId
  visible: boolean
  /** Zone `top` : masquable mais jamais réordonnable (pas de flèches). */
  reorderable: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

const { t } = useT()

const label = computed(() => t(`dashboard.widgets.${props.id}`))
</script>

<template>
  <li
    class="flex items-center gap-2 rounded-(--radius-control) border border-border bg-surface-elevated px-3 py-2"
    :data-testid="`dashboard-customize-row-${id}`"
  >
    <label class="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3">
      <span class="truncate text-sm text-fg" :class="{ 'text-fg-muted': !visible }">
        {{ label }}
      </span>
      <button
        type="button"
        role="switch"
        :aria-checked="visible ? 'true' : 'false'"
        :aria-label="t('dashboard.customize.toggle', { widget: label })"
        class="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-surface-muted p-0.5 transition-[background-color] duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        :class="visible ? 'bg-mint-200 border-mint-300' : ''"
        @click="emit('toggle')"
      >
        <span
          class="h-5 w-5 rounded-full bg-surface-elevated shadow-(--shadow-xs) transition-[transform] duration-(--motion-fast) ease-premium"
          :class="visible ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </label>
    <div v-if="reorderable" class="flex shrink-0 items-center gap-1">
      <BaseButton
        variant="ghost"
        size="icon"
        :disabled="!canMoveUp"
        :aria-label="t('dashboard.customize.moveUp', { widget: label })"
        data-testid="dashboard-customize-up"
        @click="emit('move-up')"
      >
        <ChevronUpIcon class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="icon"
        :disabled="!canMoveDown"
        :aria-label="t('dashboard.customize.moveDown', { widget: label })"
        data-testid="dashboard-customize-down"
        @click="emit('move-down')"
      >
        <ChevronDownIcon class="h-4 w-4" aria-hidden="true" />
      </BaseButton>
    </div>
  </li>
</template>
