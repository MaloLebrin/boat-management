<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const upgradeOpen = ref(false)

/** Silhouettes de l'aperçu : aucune donnée réelle n'est envoyée à un compte Starter. */
const placeholderCards = 4
const placeholderBars = [40, 65, 30, 80, 55, 70]
</script>

<template>
  <div class="relative" data-test="report-locked">
    <div class="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden="true">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="n in placeholderCards"
          :key="n"
          class="h-24 rounded-(--radius-card) border border-border bg-surface-elevated"
        />
      </div>
      <div
        class="mt-6 flex h-64 items-end gap-4 rounded-(--radius-card) border border-border bg-surface-elevated p-6"
      >
        <div
          v-for="(height, index) in placeholderBars"
          :key="index"
          class="flex-1 rounded-t bg-brand-soft"
          :style="{ height: `${height}%` }"
        />
      </div>
    </div>
    <div class="absolute inset-0 flex items-center justify-center p-4">
      <div
        class="max-w-md rounded-(--radius-card) border border-border bg-surface-elevated p-6 text-center shadow-(--shadow-sm)"
      >
        <h2 class="font-display text-xl font-bold text-fg">{{ t('reports.locked.title') }}</h2>
        <p class="mt-2 text-sm text-fg-muted">{{ t('reports.locked.body') }}</p>
        <BaseButton class="mt-4" data-test="report-upgrade" @click="upgradeOpen = true">
          {{ t('reports.locked.cta') }}
        </BaseButton>
      </div>
    </div>
    <UpgradePlanModal v-model:open="upgradeOpen" feature="reports" />
  </div>
</template>
