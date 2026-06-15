<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import HomeBentoGridSection from '~/components/marketing/home/HomeBentoGridSection.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { useT } from '~/composables/use_t'

defineProps<{
  threeThings: { title: string; items: Array<{ icon: string; title: string; description: string }> }
  problem: { title: string; items: Array<{ title: string; description: string }> }
  features: {
    title: string
    subtitle: string
    items: Array<{ title: string; description: string }>
  }
  bentoGrid: { title: string; items: Array<{ title: string; description: string }> }
  pullQuote: { quote: string; author: string; role: string }
  personas: {
    title: string
    cta: string
    items: Array<{ icon: string; title: string; description: string; example: string }>
  }
}>()

const { t: tApp } = useT()

const { el: threeThingsEl, isVisible: threeThingsVisible } = useScrollReveal()
const { el: problemEl, isVisible: problemVisible } = useScrollReveal()
const { el: featuresEl, isVisible: featuresVisible } = useScrollReveal()

const { el: personasEl, isVisible: personasVisible } = useScrollReveal()
</script>

<template>
  <!-- Section: Three things -->
  <section :ref="threeThingsEl" class="mt-14 reveal py-16" :class="{ visible: threeThingsVisible }">
    <div class="mb-10 text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ tApp('homePreview.eyebrowHowItWorks') }}
      </p>
      <h2 class="mt-2 font-display text-3xl italic text-fg">{{ threeThings.title }}</h2>
    </div>
    <div class="grid gap-6 md:grid-cols-3">
      <div
        v-for="item in threeThings.items"
        :key="item.title"
        class="rounded-xl border border-bone bg-paper p-6"
      >
        <div class="text-3xl">{{ item.icon }}</div>
        <h3 class="mt-3 font-semibold text-fg">{{ item.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ item.description }}</p>
      </div>
    </div>
  </section>

  <!-- Section 3: Problem -->
  <section :ref="problemEl" class="mt-14 reveal" :class="{ visible: problemVisible }">
    <BaseCard padded>
      <template #header>
        <p class="font-display text-sm font-semibold text-fg">{{ problem.title }}</p>
      </template>
      <div class="grid gap-4 lg:grid-cols-2">
        <div
          v-for="it in problem.items"
          :key="it.title"
          class="rounded-(--radius-control) border border-border border-l-4 border-l-coral-400/60 bg-surface-muted px-4 py-3"
        >
          <p class="text-sm font-semibold text-fg">{{ it.title }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ it.description }}</p>
        </div>
      </div>
    </BaseCard>
  </section>

  <!-- Section 4: Features -->
  <section
    id="features"
    :ref="featuresEl"
    class="mt-14 reveal"
    :class="{ visible: featuresVisible }"
  >
    <BaseCard padded>
      <template #header>
        <div class="space-y-2">
          <p class="font-display text-sm font-semibold text-fg">{{ features.title }}</p>
          <p class="text-sm text-fg-muted">{{ features.subtitle }}</p>
        </div>
      </template>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(f, idx) in features.items"
          :key="f.title"
          class="reveal rounded-(--radius-control) border border-border border-l-2 border-l-navy-500/40 bg-surface-elevated px-4 py-4 shadow-(--shadow-xs)"
          :class="[`reveal-delay-${idx % 4}`, { visible: featuresVisible }]"
        >
          <p class="text-sm font-semibold text-fg">{{ f.title }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ f.description }}</p>
        </div>
      </div>
    </BaseCard>
  </section>

  <!-- Section: Bento grid -->
  <HomeBentoGridSection :bento-grid="bentoGrid" />

  <!-- Section: Pull quote -->
  <section class="py-14 text-center">
    <div class="mx-auto max-w-2xl">
      <div
        class="mb-4 h-10 w-10 mx-auto rounded-full bg-bone flex items-center justify-center text-sm text-fg-muted"
      >
        &#128100;
      </div>
      <blockquote class="font-display text-2xl italic leading-snug text-fg">
        "{{ pullQuote.quote }}"
      </blockquote>
      <p class="mt-4 text-sm text-fg-muted">{{ pullQuote.author }} — {{ pullQuote.role }}</p>
    </div>
  </section>

  <!-- Section: Personas -->
  <section :ref="personasEl" class="reveal py-14" :class="{ visible: personasVisible }">
    <div class="mb-10 text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ tApp('homePreview.eyebrowForWho') }}
      </p>
      <h2 class="mt-2 font-display text-3xl italic text-fg">{{ personas.title }}</h2>
    </div>
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="item in personas.items"
        :key="item.title"
        class="flex flex-col rounded-xl border border-bone bg-paper p-5"
      >
        <div class="text-3xl">{{ item.icon }}</div>
        <h3 class="mt-3 font-semibold text-fg">{{ item.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-fg-muted grow">{{ item.description }}</p>
        <hr class="my-4 border-bone" />
        <p class="text-xs text-fg-subtle">{{ item.example }}</p>
        <a href="#" class="mt-3 text-xs font-medium text-brand hover:underline">{{
          personas.cta
        }}</a>
      </div>
    </div>
  </section>
</template>
