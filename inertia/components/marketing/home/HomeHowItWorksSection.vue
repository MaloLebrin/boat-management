<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'
import { useT } from '~/composables/useT'

defineProps<{
  howItWorks: { title: string; subtitle: string; items: Array<{ step: string; title: string; description: string }> }
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
    :ref="(el) => howItWorksEl = el as HTMLElement"
    class="mt-14 reveal bg-cream rounded-xl py-12 px-8"
    :class="{ visible: howItWorksVisible }"
  >
    <div class="text-center mb-10">
      <BaseHeading level="2">{{ howItWorks.title }}</BaseHeading>
      <p class="mt-2 text-fg-muted">{{ howItWorks.subtitle }}</p>
    </div>
    <div class="grid gap-6 lg:grid-cols-3">
      <div
        v-for="(step, idx) in howItWorks.items"
        :key="step.step"
        class="reveal bg-paper border border-bone rounded-xl px-6 py-8"
        :class="[`reveal-delay-${idx + 1}`, { visible: howItWorksVisible }]"
      >
        <p class="font-display text-5xl italic text-coral-500/20">{{ step.step }}</p>
        <p class="mt-4 text-sm font-semibold text-fg">{{ step.title }}</p>
        <p class="mt-2 text-sm text-fg-muted">{{ step.description }}</p>
      </div>
    </div>
  </section>

  <!-- Section 6: Preview dashboard mockup -->
  <section
    :ref="(el) => previewEl = el as HTMLElement"
    class="mt-14 reveal grid gap-6 lg:grid-cols-2 lg:items-center"
    :class="{ visible: previewVisible }"
  >
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
  </section>
</template>
