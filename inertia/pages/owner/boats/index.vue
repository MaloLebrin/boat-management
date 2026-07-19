<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import type { BoatOwnerBoatSummary } from '../../../../shared/types/boat'

defineProps<{
  boats: BoatOwnerBoatSummary[]
}>()

const { t } = useT()
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <BaseHeading level="1" class="mb-8">{{ t('owner.boats.index.title') }}</BaseHeading>

    <BaseEmptyState
      v-if="boats.length === 0"
      :title="t('owner.boats.index.emptyTitle')"
      :description="t('owner.boats.index.emptyDescription')"
    />

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <Link v-for="boat in boats" :key="boat.id" :href="`/owner/boats/${boat.id}`">
        <BaseCard class="h-full transition-shadow hover:shadow-(--shadow-md)">
          <p class="text-base font-semibold text-fg">{{ boat.name }}</p>
          <p v-if="boat.manufacturer || boat.model" class="mt-1 text-sm text-fg-muted">
            {{ [boat.manufacturer, boat.model].filter(Boolean).join(' ') }}
          </p>
          <p v-if="boat.homePort" class="mt-1 text-xs text-fg-muted">
            {{ t('owner.boats.index.homePort', { port: boat.homePort }) }}
          </p>
        </BaseCard>
      </Link>
    </div>
  </div>
</template>
