<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { InstrumentSetupStep, InstrumentSetupStepKey } from '#shared/types/instruments'

/** Stepper vertical (#1023) : une seule étape ouverte, `aria-current` sur celle-ci. */
defineProps<{ steps: InstrumentSetupStep[]; openKey: InstrumentSetupStepKey }>()
defineEmits<{ select: [key: InstrumentSetupStepKey] }>()

const { t } = useT()
</script>

<template>
  <ol class="space-y-3" data-testid="instrument-setup-stepper">
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      :aria-current="step.key === openKey ? 'step' : undefined"
      :data-step="step.key"
      :data-done="step.done"
      class="rounded-lg border border-border bg-surface"
    >
      <button
        type="button"
        class="flex w-full items-center gap-3 px-4 py-3 text-left"
        :aria-expanded="step.key === openKey"
        @click="$emit('select', step.key)"
      >
        <span
          :class="[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            step.done ? 'bg-success text-on-brand' : 'bg-surface-muted text-fg-muted',
          ]"
          aria-hidden="true"
        >
          {{ step.done ? '✓' : index + 1 }}
        </span>
        <span class="text-sm font-semibold text-fg">{{
          t(`instruments.setup.steps.${step.key}`)
        }}</span>
        <span v-if="step.done" class="sr-only">{{ t('instruments.setup.stepDone') }}</span>
      </button>
      <div v-if="step.key === openKey" class="border-t border-border px-4 py-4">
        <slot :name="step.key" />
      </div>
    </li>
  </ol>
</template>
