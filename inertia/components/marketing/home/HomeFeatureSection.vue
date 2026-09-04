<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { useTilt } from '~/composables/use_tilt'
import HomeBrowserFrame from './HomeBrowserFrame.vue'
import HomeMockBoatDetail from './HomeMockBoatDetail.vue'
import HomeMockPlanning from './HomeMockPlanning.vue'
import HomeMockFleetide from './HomeMockFleetide.vue'
import HomeMockDashboard from './HomeMockDashboard.vue'
import HomeMockUpcomingTasks from './HomeMockUpcomingTasks.vue'
import type { FeatureCta, FeatureMockType } from '#shared/types/marketing'

interface FeatureData {
  eyebrow: string
  title: string
  titleHighlight: string
  body: string
  bullets: string[]
  mockType: FeatureMockType
  isAi?: boolean
  reversed?: boolean
  bgClass?: string
  anchorId?: string
  /** Lien d'approfondissement vers la page marketing dédiée à la fonctionnalité. */
  cta?: FeatureCta
}

const props = defineProps<FeatureData>()

const { el: sectionEl, isVisible } = useScrollReveal()
const { el: tiltEl, transform: tiltTransform } = useTilt({ max: 7 })

const mockComponents: Record<FeatureMockType, typeof HomeMockBoatDetail> = {
  boatDetail: HomeMockBoatDetail,
  planning: HomeMockPlanning,
  fleetide: HomeMockFleetide,
  dashboard: HomeMockDashboard,
  upcomingTasks: HomeMockUpcomingTasks,
}
</script>

<template>
  <section
    :id="anchorId"
    :ref="sectionEl"
    class="reveal scroll-mt-24 px-6 py-20 lg:px-8 lg:py-24"
    :class="[bgClass || 'bg-cream', { visible: isVisible }]"
  >
    <div class="mx-auto max-w-7xl">
      <div
        class="grid items-center gap-12 lg:gap-16"
        :class="
          reversed ? 'lg:grid-cols-[3fr_2fr] lg:grid-flow-col-dense' : 'lg:grid-cols-[2fr_3fr]'
        "
      >
        <!-- Text content -->
        <div :class="{ 'lg:col-start-2': reversed }">
          <p
            class="mb-4 font-mono text-xs font-semibold uppercase tracking-widest"
            :class="isAi ? 'text-violet-700' : 'text-coral-600'"
          >
            {{ eyebrow }}
          </p>
          <h2 class="mb-4 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }}
            <em :class="isAi ? 'text-violet-700' : 'text-coral-500'">{{ titleHighlight }}</em>
          </h2>
          <p class="mb-6 text-lg text-fg-muted">
            {{ body }}
          </p>
          <ul class="space-y-3">
            <li
              v-for="(bullet, idx) in bullets"
              :key="idx"
              class="flex items-start gap-3 text-sm text-fg-muted"
            >
              <svg
                class="mt-0.5 h-5 w-5 shrink-0"
                :class="isAi ? 'text-violet-700' : 'text-mint-600'"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ bullet }}</span>
            </li>
          </ul>
          <Link
            v-if="cta"
            :href="cta.href"
            class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
            :class="
              isAi ? 'text-violet-700 hover:text-violet-800' : 'text-coral-600 hover:text-coral-700'
            "
          >
            {{ cta.label }}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <!-- Mock — carte 3D inclinable au survol -->
        <div
          :ref="tiltEl"
          class="will-change-transform"
          :class="{ 'lg:col-start-1': reversed }"
          :style="{ transform: tiltTransform }"
        >
          <HomeBrowserFrame>
            <!-- upcomingTasks est un panneau à défilement infini (flex-1) conçu
                 pour vivre dans le dashboard : hors de lui, il lui faut un
                 conteneur flex qui remplit la hauteur du cadre (h-full). -->
            <div v-if="mockType === 'upcomingTasks'" class="flex h-full flex-col bg-cream p-4">
              <component :is="mockComponents[mockType]" />
            </div>
            <component :is="mockComponents[mockType]" v-else />
          </HomeBrowserFrame>
        </div>
      </div>
    </div>
  </section>
</template>
