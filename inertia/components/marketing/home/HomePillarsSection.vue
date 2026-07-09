<script setup lang="ts">
import CardGlowCanvas from '~/components/marketing/canvas/CardGlowCanvas.vue'
import { fadeUp, scaleIn } from '~/composables/use_motion_presets'

interface PillarItem {
  number: string
  title: string
  description: string
  isAi?: boolean
}

defineProps<{
  title: string
  titleHighlight: string
  items: PillarItem[]
}>()

const titleMotion = fadeUp(0)
// Les cartes apparaissent en zoom, staggerées, pour varier du fade vertical.
const cardMotion = (idx: number) => scaleIn(120 + idx * 100)
</script>

<template>
  <section class="bg-paper px-6 py-20 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-7xl">
      <!-- Title -->
      <h2
        v-motion="titleMotion"
        class="mx-auto mb-12 max-w-2xl text-center font-display text-3xl leading-tight text-fg lg:text-4xl"
      >
        {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
      </h2>

      <!-- Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(item, idx) in items"
          :key="item.title"
          v-motion="cardMotion(idx)"
          class="group relative overflow-hidden rounded-xl border border-bone bg-white p-6 transition-shadow duration-300 hover:shadow-md"
        >
          <!-- Fond animé « aurora » (canvas), violet pour le pilier IA -->
          <CardGlowCanvas
            :color="item.isAi ? '#5a4a8a' : '#e2674f'"
            :color2="item.isAi ? '#3d6f9c' : '#5a4a8a'"
          />
          <div class="relative z-10">
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold"
              :class="item.isAi ? 'bg-violet-100 text-violet-700' : 'bg-navy-100 text-navy-700'"
            >
              {{ item.number }}
            </div>
            <h3 class="mb-2 text-lg font-semibold text-fg">
              {{ item.title }}
            </h3>
            <p class="text-sm leading-relaxed text-fg-muted">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
