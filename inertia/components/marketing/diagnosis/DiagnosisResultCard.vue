<script setup lang="ts">
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import type { PublicDiagnosisResult } from '#shared/types/public_diagnosis'

defineProps<{ result: PublicDiagnosisResult; isAuthenticated: boolean }>()

const { t } = useT()
</script>

<template>
  <div class="rounded-2xl border border-border bg-surface-elevated p-5 lg:p-6">
    <p class="text-xs font-semibold uppercase tracking-widest text-brand">
      {{ t('publicDiagnosis.result_title') }}
    </p>
    <h3 class="mt-2 font-display text-lg text-fg">{{ result.summary }}</h3>

    <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
      {{ t('publicDiagnosis.result_causes_title') }}
    </p>
    <ol class="mt-2 space-y-2">
      <li
        v-for="(cause, idx) in result.causes"
        :key="idx"
        class="flex items-start gap-2.5 text-sm text-fg"
      >
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand"
        >
          {{ idx + 1 }}
        </span>
        {{ cause }}
      </li>
    </ol>

    <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
      {{ t('publicDiagnosis.result_next_step_title') }}
    </p>
    <p class="mt-1.5 text-sm text-fg">{{ result.nextStep }}</p>

    <p class="mt-4 text-xs italic text-fg-muted">{{ t('publicDiagnosis.result_disclaimer') }}</p>

    <div v-if="!isAuthenticated" class="mt-6 rounded-xl bg-brand-soft p-4 lg:p-5">
      <p class="font-display text-base text-fg">{{ t('publicDiagnosis.result_cta_title') }}</p>
      <p class="mt-1.5 text-sm text-fg-muted">{{ t('publicDiagnosis.result_cta_text') }}</p>
      <BaseButton href="/signup?from=diagnostic" variant="primary" class="mt-4">
        {{ t('publicDiagnosis.result_cta_button') }}
      </BaseButton>
    </div>
  </div>
</template>
