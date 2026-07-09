<script setup lang="ts">
import { fadeLeft, fadeRight } from '~/composables/use_motion_presets'
import { useTilt } from '~/composables/use_tilt'
import HomeBrowserFrame from './HomeBrowserFrame.vue'
import HomeMockBoatDetail from './HomeMockBoatDetail.vue'
import HomeMockPlanning from './HomeMockPlanning.vue'
import HomeMockFleetide from './HomeMockFleetide.vue'

type MockType = 'boatDetail' | 'planning' | 'fleetide'

interface FeatureData {
  eyebrow: string
  title: string
  titleHighlight: string
  body: string
  bullets: string[]
  mockType: MockType
  isAi?: boolean
  reversed?: boolean
  bgClass?: string
}

const props = defineProps<FeatureData>()

const { el: tiltEl, transform: tiltTransform } = useTilt({ max: 7 })

// Reveals directionnels : le texte et le mock entrent depuis des côtés opposés,
// inversés quand la section est en `reversed` pour suivre la mise en page.
const textMotion = props.reversed ? fadeRight() : fadeLeft()
const mockMotion = props.reversed ? fadeLeft(120) : fadeRight(120)

const mockComponents: Record<MockType, typeof HomeMockBoatDetail> = {
  boatDetail: HomeMockBoatDetail,
  planning: HomeMockPlanning,
  fleetide: HomeMockFleetide,
}
</script>

<template>
  <section class="px-6 py-20 lg:px-8 lg:py-24" :class="bgClass || 'bg-cream'">
    <div class="mx-auto max-w-7xl">
      <div
        class="grid items-center gap-12 lg:gap-16"
        :class="
          reversed ? 'lg:grid-cols-[3fr_2fr] lg:grid-flow-col-dense' : 'lg:grid-cols-[2fr_3fr]'
        "
      >
        <!-- Text content -->
        <div v-motion="textMotion" :class="{ 'lg:col-start-2': reversed }">
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
                :class="isAi ? 'text-violet-600' : 'text-mint-600'"
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
        </div>

        <!-- Mock — reveal directionnel (wrapper) → tilt 3D (inner). Séparés pour
             que le transform d'entrée n'écrase pas celui du tilt. -->
        <div v-motion="mockMotion" :class="{ 'lg:col-start-1': reversed }">
          <div :ref="tiltEl" class="will-change-transform" :style="{ transform: tiltTransform }">
            <HomeBrowserFrame>
              <component :is="mockComponents[mockType]" />
            </HomeBrowserFrame>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
