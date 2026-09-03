<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import HomeBrowserFrame from '~/components/marketing/home/HomeBrowserFrame.vue'
import HomeMockBoatDetail from '~/components/marketing/home/HomeMockBoatDetail.vue'
import HomeMockPlanning from '~/components/marketing/home/HomeMockPlanning.vue'
import HomeMockFleetide from '~/components/marketing/home/HomeMockFleetide.vue'
import HomeMockDashboard from '~/components/marketing/home/HomeMockDashboard.vue'
import HomeMockUpcomingTasks from '~/components/marketing/home/HomeMockUpcomingTasks.vue'
import type { FeatureCta, FeatureMockType } from '#shared/types/marketing'

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  primaryCta: FeatureCta
  secondaryCta: FeatureCta
  reassurance: string
  mockType: FeatureMockType
  isAi?: boolean
}>()

const mockComponents: Record<FeatureMockType, typeof HomeMockBoatDetail> = {
  boatDetail: HomeMockBoatDetail,
  planning: HomeMockPlanning,
  fleetide: HomeMockFleetide,
  dashboard: HomeMockDashboard,
  upcomingTasks: HomeMockUpcomingTasks,
}
</script>

<template>
  <section class="bg-cream px-6 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
    <div class="mx-auto max-w-3xl text-center">
      <p
        class="font-mono text-xs font-semibold uppercase tracking-widest"
        :class="isAi ? 'text-violet-700' : 'text-coral-600'"
      >
        {{ eyebrow }}
      </p>
      <h1 class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl">
        {{ title }}
        <em :class="isAi ? 'text-violet-700' : 'text-coral-500'">{{ titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ subtitle }}</p>
      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          :href="primaryCta.href"
          class="rounded-xl bg-coral-500 px-8 py-3 text-sm font-semibold text-white hover:bg-coral-600"
        >
          {{ primaryCta.label }}
        </Link>
        <Link
          :href="secondaryCta.href"
          class="rounded-xl border border-border bg-surface px-8 py-3 text-sm font-semibold text-fg hover:bg-surface-muted"
        >
          {{ secondaryCta.label }}
        </Link>
      </div>
      <p class="mt-4 text-xs text-fg-subtle">{{ reassurance }}</p>
    </div>

    <div class="mx-auto mt-12 max-w-4xl">
      <HomeBrowserFrame>
        <component :is="mockComponents[mockType]" />
      </HomeBrowserFrame>
    </div>
  </section>
</template>
