<script setup lang="ts">
interface CostRow {
  type: string
  length: string
  budget: string
  note: string
}

interface Props {
  eyebrow: string
  title: string
  colType: string
  colLength: string
  colBudget: string
  colNote: string
  rows: CostRow[]
  simulatorUrl: string
  ctaLabel: string
}

defineProps<Props>()
</script>

<template>
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-4xl">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ eyebrow }}</p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">{{ title }}</h2>

      <div class="mt-8 overflow-x-auto rounded-xl border border-bone">
        <table class="w-full text-sm">
          <thead class="bg-bone">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-fg">{{ colType }}</th>
              <th class="px-4 py-3 text-left font-semibold text-fg">{{ colLength }}</th>
              <th class="px-4 py-3 text-left font-semibold text-fg text-coral-600">{{ colBudget }}</th>
              <th class="hidden px-4 py-3 text-left font-semibold text-fg-muted sm:table-cell">{{ colNote }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bone">
            <tr
              v-for="(row, i) in rows"
              :key="i"
              class="transition-colors hover:bg-bone/40"
            >
              <td class="px-4 py-3 font-semibold text-fg">{{ row.type }}</td>
              <td class="px-4 py-3 text-fg-muted">{{ row.length }}</td>
              <td class="px-4 py-3 font-semibold text-coral-600">{{ row.budget }}</td>
              <td class="hidden px-4 py-3 text-xs text-fg-subtle sm:table-cell">{{ row.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-4 text-center">
        <a
          :href="simulatorUrl"
          class="text-sm font-semibold text-coral-500 hover:underline"
        >{{ ctaLabel }}</a>
      </p>
    </div>
  </section>
</template>
