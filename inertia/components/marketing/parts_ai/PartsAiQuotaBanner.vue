<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import type { PublicPartSearchQuotaProps } from '#shared/types/spare_part_chat'

const props = defineProps<{ quota: PublicPartSearchQuotaProps; isAuthenticated: boolean }>()

const { t } = useT()

const remaining = computed(() =>
  props.quota.limit === null ? null : Math.max(props.quota.limit - props.quota.used, 0)
)
const exhausted = computed(() => remaining.value !== null && remaining.value <= 0)
</script>

<template>
  <div v-if="exhausted" class="rounded-2xl border border-border bg-brand-soft p-5 text-center">
    <p class="font-display text-lg text-fg">{{ t('publicPartSearch.quota_exhausted_title') }}</p>
    <p class="mt-2 text-sm text-fg-muted">{{ t('publicPartSearch.quota_exhausted_text') }}</p>
    <BaseButton v-if="!isAuthenticated" href="/signup?from=parts" variant="primary" class="mt-4">
      {{ t('publicPartSearch.quota_exhausted_button') }}
    </BaseButton>
  </div>
  <p v-else-if="remaining !== null" class="text-center text-xs font-medium text-fg-subtle">
    {{ t('publicPartSearch.quota_remaining', { remaining: String(remaining) }) }}
  </p>
</template>
