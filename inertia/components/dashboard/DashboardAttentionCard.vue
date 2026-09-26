<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DashboardAttentionChips from '~/components/dashboard/DashboardAttentionChips.vue'
import DashboardAttentionRow from '~/components/dashboard/DashboardAttentionRow.vue'
import type { DashboardAttention } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'

const props = defineProps<{ attention: DashboardAttention }>()

const { t } = useT()

/** Éléments comptés mais non affichés : les puces de l'en-tête mènent à chaque type. */
const remaining = computed(() =>
  Math.max(props.attention.counts.total - props.attention.items.length, 0)
)
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('dashboard.attention.title') }}
          <span v-if="attention.counts.total > 0" class="text-fg-muted">
            · {{ attention.counts.total }}
          </span>
        </h2>
        <Link
          href="/planning"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.viewPlanning') }}
        </Link>
      </div>
      <DashboardAttentionChips
        class="mt-2"
        :counts="attention.counts"
        :can-view-invoices="attention.canViewInvoices"
      />
    </template>

    <p v-if="attention.items.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.attention.empty') }}
    </p>

    <ul v-else class="space-y-3 text-sm">
      <DashboardAttentionRow v-for="item in attention.items" :key="item.key" :item="item" />
    </ul>

    <template v-if="remaining > 0" #footer>
      <p class="text-sm text-fg-muted" data-testid="dashboard-attention-more">
        {{ t('dashboard.attention.more', { count: String(remaining) }) }}
      </p>
    </template>
  </BaseCard>
</template>
