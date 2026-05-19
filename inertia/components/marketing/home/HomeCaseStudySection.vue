<script setup lang="ts">
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

defineProps<{
  caseStudy: {
    title: string
    subtitle: string
    company: string
    challengeLabel: string
    challenge: string
    solutionLabel: string
    solution: string
    resultsLabel: string
    results: string[]
    metrics: Array<{ value: string; label: string }>
    cta: { text: string; href: string }
  }
}>()

const { el: sectionEl, isVisible: sectionVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => sectionEl = el as HTMLElement"
    class="reveal mt-14 bg-cream rounded-2xl py-14 px-8"
    :class="{ visible: sectionVisible }"
  >
    <!-- Header -->
    <div class="text-center mb-10">
      <BaseBadge variant="neutral">{{ caseStudy.subtitle }}</BaseBadge>
      <BaseHeading level="2" class="mt-3">{{ caseStudy.title }}</BaseHeading>
      <p class="mt-2 text-fg-muted">{{ caseStudy.company }}</p>
    </div>

    <!-- Metrics -->
    <div class="grid gap-6 md:grid-cols-3 mb-10">
      <div
        v-for="metric in caseStudy.metrics"
        :key="metric.label"
        class="text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
      >
        <p class="font-display text-4xl italic text-navy-900">{{ metric.value }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ metric.label }}</p>
      </div>
    </div>

    <!-- Content: Challenge / Solution / Results -->
    <div class="grid gap-6 lg:grid-cols-3 mt-10">
      <!-- Challenge -->
      <div class="hover:shadow-lg transition-all duration-200 rounded-lg p-4">
        <p class="text-sm font-semibold text-coral-500 mb-2">{{ caseStudy.challengeLabel }}</p>
        <p class="text-sm text-fg-muted">{{ caseStudy.challenge }}</p>
      </div>

      <!-- Solution -->
      <div class="hover:shadow-lg transition-all duration-200 rounded-lg p-4">
        <p class="text-sm font-semibold text-navy-900 mb-2">{{ caseStudy.solutionLabel }}</p>
        <p class="text-sm text-fg-muted">{{ caseStudy.solution }}</p>
      </div>

      <!-- Results -->
      <div class="hover:shadow-lg transition-all duration-200 rounded-lg p-4">
        <p class="text-sm font-semibold text-mint-700 mb-2">{{ caseStudy.resultsLabel }}</p>
        <ul class="space-y-1">
          <li v-for="result in caseStudy.results" :key="result" class="flex items-start gap-2 text-sm text-fg-muted">
            <CheckCircleIcon class="h-5 w-5 shrink-0 text-mint-700" />
            <span>{{ result }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- CTA -->
    <div class="mt-10 text-center">
      <BaseButton size="lg" :href="caseStudy.cta.href" class="group">
        {{ caseStudy.cta.text }}
        <ArrowRightIcon class="h-4 w-4 ml-1 inline-block transition-transform group-hover:translate-x-1" />
      </BaseButton>
    </div>
  </section>
</template>
