<script setup lang="ts">
import { BellAlertIcon, ChartBarIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { useT } from '~/composables/use_t'

const stepIcons = [ClipboardDocumentListIcon, BellAlertIcon, ChartBarIcon]

defineProps<{
  howItWorks: {
    title: string
    subtitle: string
    items: Array<{ step: string; title: string; description: string; detail: string }>
    timeline: { title: string; items: Array<{ day: string; label: string }> }
  }
  preview: { title: string; subtitle: string }
  brand: { name: string }
  locale: 'en' | 'fr'
}>()

const { t: tApp } = useT()

const { el: howItWorksEl, isVisible: howItWorksVisible } = useScrollReveal()
const { el: previewEl, isVisible: previewVisible } = useScrollReveal()
</script>

<template>
  <!-- Section 5: How it works -->
  <section
    :ref="howItWorksEl"
    class="mt-14 reveal px-6 lg:px-8"
    :class="{ visible: howItWorksVisible }"
  >
    <div class="mx-auto max-w-6xl">
      <div class="text-center mb-10">
        <BaseHeading level="2">{{ howItWorks.title }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ howItWorks.subtitle }}</p>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div
          v-for="(step, idx) in howItWorks.items"
          :key="step.step"
          class="reveal bg-paper border border-bone rounded-xl px-6 py-8 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
          :class="[`reveal-delay-${idx + 1}`, { visible: howItWorksVisible }]"
        >
          <component :is="stepIcons[idx]" class="h-8 w-8 text-coral-500 mb-3" />
          <p class="font-display text-5xl italic text-coral-500/20">{{ step.step }}</p>
          <p class="mt-4 text-sm font-semibold text-fg">{{ step.title }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ step.description }}</p>
          <p
            v-if="step.detail"
            class="mt-3 text-xs text-fg-subtle italic border-t border-bone/60 pt-2"
          >
            {{ step.detail }}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Timeline J1/J7/J30 -->
  <section class="mt-10 px-6 lg:px-8">
    <div class="mx-auto max-w-4xl rounded-2xl bg-navy-900 px-6 py-10 shadow-xl sm:px-12">
      <p class="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-white/50">
        {{ howItWorks.timeline.title }}
      </p>
      <div class="relative flex flex-col gap-8 sm:flex-row sm:justify-between">
        <!-- Ligne de liaison horizontale (desktop) -->
        <div
          class="pointer-events-none absolute inset-x-8 top-1.5 hidden h-px bg-gradient-to-r from-coral-500/60 via-white/15 to-white/5 sm:block"
          aria-hidden="true"
        ></div>
        <div
          v-for="(item, idx) in howItWorks.timeline.items"
          :key="item.day"
          class="relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:text-center"
        >
          <template v-if="idx === 0">
            <span class="relative flex h-3 w-3 mt-1 sm:mt-0 sm:mb-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-coral-500"></span>
            </span>
          </template>
          <span
            v-else
            class="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white sm:-mt-2 sm:mb-2"
            >{{ idx + 1 }}</span
          >
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-coral-400">
              {{ item.day }}
            </p>
            <p class="mt-0.5 text-sm text-white/80">{{ item.label }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Section 6: Preview dashboard mockup -->
  <section :ref="previewEl" class="mt-14 reveal px-6 lg:px-8" :class="{ visible: previewVisible }">
    <div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
      <div class="space-y-3">
        <BaseHeading level="2">{{ preview.title }}</BaseHeading>
        <p class="text-pretty text-lg text-fg-muted">{{ preview.subtitle }}</p>
      </div>

      <div class="rounded-xl border border-navy-800 bg-navy-900 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-white">{{ brand.name }}</p>
          <BaseBadge variant="success">{{ tApp('homePreview.badge') }}</BaseBadge>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
            <p class="text-xs font-semibold text-coral-400">{{ tApp('homePreview.urgent') }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">3</p>
            <p class="mt-1 text-xs text-white/50">{{ tApp('homePreview.overdueHint') }}</p>
          </div>
          <div class="rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
            <p class="text-xs font-semibold text-amber-600">{{ tApp('homePreview.dueSoon') }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">7</p>
            <p class="mt-1 text-xs text-white/50">{{ tApp('homePreview.dueSoonHint') }}</p>
          </div>
        </div>

        <div class="mt-3 rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-white">{{ tApp('homePreview.boat') }} - Aurore</p>
            <BaseBadge variant="info">{{ tApp('homePreview.engine') }} 1</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-white/55">
            {{ tApp('homePreview.engineDetail') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
