<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

defineProps<{
  faq: { title: string; items: Array<{ q: string; a: string }> }
  finalCta: { title: string; subtitle: string; primary: string; secondary: string }
  locale: 'en' | 'fr'
}>()

const { el: faqEl, isVisible: faqVisible } = useScrollReveal()
</script>

<template>
  <!-- Section 11: FAQ accordion -->
  <section
    :ref="(el) => faqEl = el as HTMLElement"
    class="mt-14 reveal"
    :class="{ visible: faqVisible }"
  >
    <div class="mb-6">
      <BaseHeading level="2">{{ faq.title }}</BaseHeading>
    </div>
    <div class="bg-white border border-bone rounded-xl overflow-hidden divide-y divide-bone">
      <details
        v-for="(qa, idx) in faq.items"
        :key="qa.q"
        :open="idx === 0"
        class="group"
      >
        <summary class="flex items-center justify-between gap-4 px-5 py-4 font-semibold text-fg">
          {{ qa.q }}
          <svg
            class="accordion-chevron h-5 w-5 shrink-0 text-fg-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div class="mt-2 text-sm text-fg-muted pb-4 px-5">{{ qa.a }}</div>
      </details>
    </div>
  </section>

  <!-- Section 12: Final CTA -->
  <section class="mt-14">
    <div class="rounded-2xl bg-navy-900 px-8 py-10 ring-1 ring-white/10">
      <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div class="space-y-2">
          <h2 class="font-display text-3xl leading-tight italic text-white lg:text-4xl">{{ finalCta.title }}</h2>
          <p class="text-pretty text-base text-white/65">{{ finalCta.subtitle }}</p>
        </div>
        <div class="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <a href="/signup">
            <BaseButton size="lg" class="bg-white! text-navy-900! hover:bg-white/90!">
              {{ finalCta.primary }}
            </BaseButton>
          </a>
          <Link :href="`/${locale}/tarifs`">
            <BaseButton size="lg" variant="ghost" class="border! border-white/25! text-white/70! hover:bg-white/10! hover:text-white!">
              {{ finalCta.secondary }}
            </BaseButton>
          </Link>
        </div>
      </div>
    </div>
  </section>
</template>
