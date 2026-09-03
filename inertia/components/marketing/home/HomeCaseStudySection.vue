<!--
  SECTION RETIRÉE DE L'AFFICHAGE — refonte marketing 2026-09 (home resserrée à 10 sections).
  Rôle d'origine : étude de cas client (défi / solution / résultats + métriques) avec CTA vers le simulateur de coût.
  Ce composant n'est plus monté nulle part, mais il est conservé volontairement
  (décision propriétaire : aucun composant supprimé, même après merge). NE PAS SUPPRIMER.
  Réactivation : décommenter son import et son bloc dans inertia/pages/marketing/home.vue ;
  ses props sont toujours construites par buildHomePageData
  (app/controllers/marketing_controller.ts), aucune reprise backend nécessaire.
-->
<script setup lang="ts">
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import HomeStatValue from './HomeStatValue.vue'

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
  <section :ref="sectionEl" class="reveal mt-14 px-6 lg:px-8" :class="{ visible: sectionVisible }">
    <div
      class="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-bone bg-paper shadow-sm"
    >
      <!-- Header -->
      <div class="border-b border-bone px-6 py-12 text-center sm:px-12">
        <BaseBadge variant="neutral">{{ caseStudy.subtitle }}</BaseBadge>
        <BaseHeading level="2" class="mt-3">{{ caseStudy.title }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ caseStudy.company }}</p>
      </div>

      <!-- Metrics — bandeau avec séparateurs -->
      <div
        class="grid divide-y divide-bone border-b border-bone sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <div v-for="metric in caseStudy.metrics" :key="metric.label" class="px-6 py-8 text-center">
          <p class="font-display text-4xl italic text-coral-500 lg:text-5xl">
            <HomeStatValue :value="metric.value" />
          </p>
          <p class="mt-2 text-sm text-fg-muted">{{ metric.label }}</p>
        </div>
      </div>

      <!-- Content: Challenge / Solution / Results -->
      <div class="grid gap-5 px-6 py-10 sm:px-12 lg:grid-cols-3">
        <!-- Challenge -->
        <div class="rounded-2xl border-t-2 border-coral-500 bg-surface-elevated p-5 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-coral-500">
            {{ caseStudy.challengeLabel }}
          </p>
          <p class="text-sm text-fg-muted">{{ caseStudy.challenge }}</p>
        </div>

        <!-- Solution -->
        <div class="rounded-2xl border-t-2 border-brand bg-surface-elevated p-5 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg">
            {{ caseStudy.solutionLabel }}
          </p>
          <p class="text-sm text-fg-muted">{{ caseStudy.solution }}</p>
        </div>

        <!-- Results -->
        <div class="rounded-2xl border-t-2 border-mint-600 bg-surface-elevated p-5 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-mint-700">
            {{ caseStudy.resultsLabel }}
          </p>
          <ul class="space-y-2">
            <li
              v-for="result in caseStudy.results"
              :key="result"
              class="flex items-start gap-2 text-sm text-fg-muted"
            >
              <CheckCircleIcon class="h-5 w-5 shrink-0 text-mint-600" />
              <span>{{ result }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- CTA -->
      <div class="border-t border-bone px-6 py-8 text-center">
        <BaseButton size="lg" :href="caseStudy.cta.href" class="group">
          {{ caseStudy.cta.text }}
          <ArrowRightIcon
            class="ml-1 inline-block h-4 w-4 transition-transform group-hover:translate-x-1"
          />
        </BaseButton>
      </div>
    </div>
  </section>
</template>
