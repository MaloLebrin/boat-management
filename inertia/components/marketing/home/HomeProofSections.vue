<script setup lang="ts">
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

const props = defineProps<{
  stats: { items: Array<{ label: string; value: string; hint: string }> }
  useCases: { title: string; items: Array<{ title: string; description: string }> }
  testimonials: { title: string; items: Array<{ quote: string; author: string; role: string; fleet: string; since: string }> }
  comparisonTable: {
    title: string; subtitle: string
    cols: { feature: string; excel: string; paper: string; fleetai: string }
    rows: string[]
    vals: { no: string; partial: string; yes: string; manual: string; auto: string; eu: string }
  }
  security: { title: string; items: Array<{ icon: string; title: string; description: string }> }
  blog: { title: string; subtitle: string; cta: string; articles: Array<{ cat: string; title: string; meta: string }> }
}>()

const { el: statsEl, isVisible: statsVisible } = useScrollReveal()
const { el: useCasesEl, isVisible: useCasesVisible } = useScrollReveal()
const { el: testimonialsEl, isVisible: testimonialsVisible } = useScrollReveal()
const { el: comparisonEl, isVisible: comparisonVisible } = useScrollReveal()
const { el: securityEl, isVisible: securityVisible } = useScrollReveal()
const { el: blogEl, isVisible: blogVisible } = useScrollReveal()

function getComparisonVal(row: string, col: 'excel' | 'paper' | 'fleetai'): string {
  const v = props.comparisonTable.vals
  const data: Record<string, [string, string, string]> = {
    [props.comparisonTable.rows[0]]: [v.no, v.partial, v.yes],
    [props.comparisonTable.rows[1]]: [v.no, v.no, v.yes],
    [props.comparisonTable.rows[2]]: [v.partial, v.no, v.yes],
    [props.comparisonTable.rows[3]]: [v.no, v.yes, v.yes],
    [props.comparisonTable.rows[4]]: [v.no, v.no, v.yes],
    [props.comparisonTable.rows[5]]: [v.no, v.partial, v.yes],
    [props.comparisonTable.rows[6]]: [v.no, v.manual, v.auto],
    [props.comparisonTable.rows[7]]: [v.partial, v.no, v.eu],
  }
  const idx = col === 'excel' ? 0 : col === 'paper' ? 1 : 2
  return data[row]?.[idx] ?? '—'
}
</script>

<template>
  <!-- Section 7: Stats KPIs -->
  <section
    :ref="(el) => statsEl = el as HTMLElement"
    class="mt-14 reveal rounded-2xl bg-navy-900 px-8 py-12"
    :class="{ visible: statsVisible }"
  >
    <div class="grid gap-6 md:grid-cols-3">
      <BaseStatCard
        v-for="s in stats.items"
        :key="s.label"
        :label="s.label"
        :value="s.value"
        :delta="s.hint"
        tone="neutral"
      />
    </div>
  </section>

  <!-- Section 8: Use cases -->
  <section
    :ref="(el) => useCasesEl = el as HTMLElement"
    class="mt-14 reveal"
    :class="{ visible: useCasesVisible }"
  >
    <BaseCard padded>
      <template #header>
        <p class="font-display text-sm font-semibold text-fg">{{ useCases.title }}</p>
      </template>
      <div class="grid gap-4 md:grid-cols-3">
        <div
          v-for="uc in useCases.items"
          :key="uc.title"
          class="rounded-(--radius-control) border border-border bg-surface-muted px-5 py-5"
        >
          <p class="text-sm font-semibold text-fg">{{ uc.title }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ uc.description }}</p>
        </div>
      </div>
    </BaseCard>
  </section>

  <!-- Section 9: Testimonials -->
  <section
    :ref="(el) => testimonialsEl = el as HTMLElement"
    class="mt-14 reveal"
    :class="{ visible: testimonialsVisible }"
  >
    <div class="text-center mb-8">
      <BaseHeading level="2">{{ testimonials.title }}</BaseHeading>
    </div>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(item, idx) in testimonials.items"
        :key="item.author"
        class="reveal bg-white border border-bone rounded-xl px-6 py-6 shadow-(--shadow-sm) hover:-translate-y-1 hover:shadow-md transition-all duration-300"
        :class="[`reveal-delay-${idx + 1}`, { visible: testimonialsVisible }]"
      >
        <ChatBubbleLeftRightIcon class="h-6 w-6 text-coral-300 mb-3" />
        <p class="text-sm italic text-fg-muted">
          <span class="text-lg text-coral-500/40">"</span>
          {{ item.quote }}
          <span class="text-lg text-coral-500/40">"</span>
        </p>
        <div class="mt-4">
          <p class="font-semibold text-fg">{{ item.author }}</p>
          <p class="text-xs text-fg-subtle">{{ item.role }}</p>
          <p class="mt-2 text-xs text-fg-subtle border-t border-bone pt-2">{{ item.fleet }} · {{ item.since }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Section: Comparison table -->
  <section
    :ref="(el) => comparisonEl = el as HTMLElement"
    class="mt-14 reveal rounded-2xl bg-paper py-14 px-8"
    :class="{ visible: comparisonVisible }"
  >
    <div class="mb-8 text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ comparisonTable.subtitle }}</p>
      <h2 class="mt-2 font-display text-3xl leading-tight italic text-fg lg:text-4xl">{{ comparisonTable.title }}</h2>
    </div>
    <div class="mx-auto max-w-3xl overflow-hidden rounded-xl border border-bone">
      <table class="w-full text-sm">
        <thead class="bg-bone/40 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          <tr>
            <th class="px-4 py-3 text-left">{{ comparisonTable.cols.feature }}</th>
            <th class="px-4 py-3 text-center">{{ comparisonTable.cols.excel }}</th>
            <th class="px-4 py-3 text-center">{{ comparisonTable.cols.paper }}</th>
            <th class="px-4 py-3 text-center bg-brand/8 text-brand font-bold">{{ comparisonTable.cols.fleetai }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in comparisonTable.rows" :key="row"
            :class="i % 2 === 0 ? 'bg-cream' : 'bg-paper'">
            <td class="px-4 py-3 font-medium text-fg">{{ row }}</td>
            <td class="px-4 py-3 text-center"><span class="text-fg-muted">{{ getComparisonVal(row, 'excel') }}</span></td>
            <td class="px-4 py-3 text-center"><span class="text-fg-subtle">{{ getComparisonVal(row, 'paper') }}</span></td>
            <td class="px-4 py-3 text-center bg-brand/5"><span class="font-semibold text-mint-700">{{ getComparisonVal(row, 'fleetai') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 10: Security -->
  <section
    :ref="(el) => securityEl = el as HTMLElement"
    class="mt-14 reveal"
    :class="{ visible: securityVisible }"
  >
    <BaseCard padded>
      <template #header>
        <p class="font-display text-sm font-semibold text-fg">{{ security.title }}</p>
      </template>
      <div class="grid gap-4 md:grid-cols-2">
        <div
          v-for="s in security.items"
          :key="s.title"
          class="rounded-(--radius-control) border border-border bg-surface-muted px-5 py-5 hover:-translate-y-1 transition-transform duration-300"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900/8 text-xl mb-3">{{ s.icon }}</div>
          <p class="text-sm font-semibold text-fg">{{ s.title }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ s.description }}</p>
        </div>
      </div>
    </BaseCard>
  </section>

  <!-- Section: Blog -->
  <section
    :ref="(el) => blogEl = el as HTMLElement"
    class="mt-14 reveal rounded-2xl bg-paper py-14 px-8"
    :class="{ visible: blogVisible }"
  >
    <div class="mb-8 flex items-end justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ blog.subtitle }}</p>
        <h2 class="mt-1 font-display text-3xl leading-tight italic text-fg lg:text-4xl">{{ blog.title }}</h2>
      </div>
      <a href="#" class="text-sm font-medium text-brand hover:underline">{{ blog.cta }}</a>
    </div>
    <div class="grid gap-5 sm:grid-cols-3">
      <div v-for="article in blog.articles" :key="article.title"
        class="group overflow-hidden rounded-xl border border-bone bg-cream">
        <div class="flex h-32 items-center justify-center bg-bone/40 text-xs text-fg-subtle group-hover:scale-105 transition-transform duration-500">image article</div>
        <div class="p-4">
          <span class="inline-block rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-fg-muted border border-bone">{{ article.cat }}</span>
          <p class="mt-2 font-semibold text-sm leading-snug text-fg">{{ article.title }}</p>
          <p class="mt-1 text-xs text-fg-subtle">{{ article.meta }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
