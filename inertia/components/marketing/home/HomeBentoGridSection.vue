<script setup lang="ts">
import {
  MapIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/useScrollReveal'

defineProps<{
  bentoGrid: { title: string; items: Array<{ title: string; description: string }> }
}>()

const { el: sectionEl, isVisible: sectionVisible } = useScrollReveal()

const cards = [
  { icon: MapIcon, bg: 'bg-navy-900', titleColor: 'text-white', descColor: 'text-white/60', featured: true },
  { icon: CalendarDaysIcon, bg: 'bg-coral-50', iconColor: 'text-coral-500', titleColor: 'text-fg', descColor: 'text-fg-muted' },
  { icon: DevicePhoneMobileIcon, bg: 'bg-mint-50', iconColor: 'text-mint-700', titleColor: 'text-fg', descColor: 'text-fg-muted' },
  { icon: DocumentTextIcon, bg: 'bg-violet-50', iconColor: 'text-violet-700', titleColor: 'text-fg', descColor: 'text-fg-muted', wide: true },
  { icon: BuildingOffice2Icon, bg: 'bg-amber-50', iconColor: 'text-amber-600', titleColor: 'text-fg', descColor: 'text-fg-muted' },
  { icon: ArrowDownTrayIcon, bg: 'bg-paper', iconColor: 'text-navy-700', titleColor: 'text-fg', descColor: 'text-fg-muted' },
]
</script>

<template>
  <section
    :ref="(el) => sectionEl = el as HTMLElement"
    class="mt-14 reveal rounded-2xl bg-paper py-14 px-8"
    :class="{ visible: sectionVisible }"
  >
    <h2 class="mb-8 text-center font-display text-2xl italic text-fg">{{ bentoGrid.title }}</h2>

    <div class="grid gap-3" style="grid-template-columns: 2fr 1fr 1fr; grid-auto-rows: 180px;">

      <!-- Card 0: Vue marina (featured, span 2 rows, navy-900) -->
      <div
        class="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        :class="cards[0].bg"
        style="grid-row: span 2;"
        :style="sectionVisible ? { transitionDelay: '0ms', opacity: 1 } : { opacity: 0 }"
      >
        <!-- Pontoon grid decoration -->
        <div class="absolute inset-0 grid grid-cols-3 gap-1.5 p-8 pt-14 opacity-15 pointer-events-none">
          <div v-for="n in 6" :key="n" class="rounded-lg bg-white h-8" />
        </div>
        <!-- Status dots -->
        <div class="absolute top-4 right-4 flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-mint-400 ring-2 ring-mint-400/30" />
          <span class="h-2.5 w-2.5 rounded-full bg-mint-400 ring-2 ring-mint-400/30" />
          <span class="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
          <span class="h-2.5 w-2.5 rounded-full bg-coral-400 ring-2 ring-coral-400/30" />
        </div>
        <!-- Icon -->
        <div class="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
          <MapIcon class="h-8 w-8 text-coral-400" />
        </div>
        <p class="relative font-semibold text-white">{{ bentoGrid.items[0].title }}</p>
        <p class="relative mt-1 text-sm text-white/60 leading-relaxed">{{ bentoGrid.items[0].description }}</p>
      </div>

      <!-- Cards 1 & 2: standard top-right -->
      <div
        v-for="(item, idx) in bentoGrid.items.slice(1, 3)"
        :key="item.title"
        class="group relative overflow-hidden rounded-2xl p-5 border border-bone transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        :class="cards[idx + 1].bg"
        :style="sectionVisible ? { transitionDelay: `${(idx + 1) * 60}ms` } : { opacity: 0 }"
      >
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60">
          <component :is="cards[idx + 1].icon" class="h-5 w-5" :class="cards[idx + 1].iconColor" />
        </div>
        <p class="font-semibold text-sm" :class="cards[idx + 1].titleColor">{{ item.title }}</p>
        <p class="mt-1 text-xs leading-relaxed" :class="cards[idx + 1].descColor">{{ item.description }}</p>
      </div>

      <!-- Card 3: Documents & IA (wide, span 2 cols) -->
      <div
        class="relative overflow-hidden rounded-2xl p-5 border border-bone transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        :class="cards[3].bg"
        style="grid-column: span 2;"
        :style="sectionVisible ? { transitionDelay: '180ms' } : { opacity: 0 }"
      >
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60">
            <DocumentTextIcon class="h-5 w-5 text-violet-700" />
          </div>
          <SparklesIcon class="h-4 w-4 text-violet-400" />
        </div>
        <p class="font-semibold text-sm" :class="cards[3].titleColor">{{ bentoGrid.items[3].title }}</p>
        <p class="mt-1 text-xs leading-relaxed" :class="cards[3].descColor">{{ bentoGrid.items[3].description }}</p>
      </div>

      <!-- Cards 4 & 5: bottom-right -->
      <div
        v-for="(item, idx) in bentoGrid.items.slice(4)"
        :key="item.title"
        class="relative overflow-hidden rounded-2xl p-5 border border-bone transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        :class="cards[idx + 4].bg"
        :style="sectionVisible ? { transitionDelay: `${(idx + 4) * 60}ms` } : { opacity: 0 }"
      >
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60">
          <component :is="cards[idx + 4].icon" class="h-5 w-5" :class="cards[idx + 4].iconColor" />
        </div>
        <p class="font-semibold text-sm" :class="cards[idx + 4].titleColor">{{ item.title }}</p>
        <p class="mt-1 text-xs leading-relaxed" :class="cards[idx + 4].descColor">{{ item.description }}</p>
      </div>
    </div>
  </section>
</template>
