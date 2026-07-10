<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface ComparisonRow {
  feature: string
  excel: string
  paper: string
  fleetai: string
}

defineProps<{
  title: string
  subtitle: string
  cols: { feature: string; excel: string; paper: string; fleetai: string }
  rows: ComparisonRow[]
}>()

const { el: sectionEl, isVisible } = useScrollReveal()

function getCellClass(value: string): string {
  if (value.includes('auto') || value.includes('EU')) return 'text-mint-400 font-semibold'
  if (value === '~') return 'text-amber-400'
  return ''
}
</script>

<template>
  <section
    :ref="sectionEl"
    class="reveal bg-navy-900 px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-4xl">
      <!-- Header -->
      <div class="mb-10 text-center">
        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-white/50">
          {{ subtitle }}
        </p>
        <h2 class="font-display text-3xl text-white lg:text-4xl">{{ title }}</h2>
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-xl border border-white/10">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[480px] text-sm">
            <thead class="bg-white/5 text-xs font-semibold uppercase tracking-wider text-white/50">
              <tr>
                <th class="px-4 py-3 text-left">{{ cols.feature }}</th>
                <th class="px-4 py-3 text-center">{{ cols.excel }}</th>
                <th class="px-4 py-3 text-center">{{ cols.paper }}</th>
                <th class="px-4 py-3 text-center bg-mint-600/20 text-mint-300 font-bold">
                  {{ cols.fleetai }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in rows"
                :key="row.feature"
                :class="idx % 2 === 0 ? 'bg-white/2' : 'bg-white/5'"
              >
                <td class="px-4 py-3 font-medium text-navy-50">{{ row.feature }}</td>
                <td class="px-4 py-3 text-center text-navy-50" :class="getCellClass(row.excel)">
                  {{ row.excel }}
                </td>
                <td class="px-4 py-3 text-center text-navy-50" :class="getCellClass(row.paper)">
                  {{ row.paper }}
                </td>
                <td
                  class="px-4 py-3 text-center bg-mint-600/10 text-navy-50"
                  :class="getCellClass(row.fleetai)"
                >
                  {{ row.fleetai }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
