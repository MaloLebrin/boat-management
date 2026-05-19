<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/solid'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface GroupRow {
  0: string // feature name
  1: boolean | string // starter
  2: boolean | string // pro
  3: boolean | string // enterprise
}

interface Group {
  title: string
  rows: GroupRow[]
}

interface PlanHeader {
  name: string
  price: string
  cta: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  expandAll: string
  collapseAll: string
  groups: Group[]
  planHeaders: PlanHeader[]
}>()

const { el, isVisible } = useScrollReveal()

// First 3 groups open by default
const openGroups = ref<Set<number>>(new Set([0, 1, 2]))

function toggleGroup(idx: number) {
  if (openGroups.value.has(idx)) {
    openGroups.value.delete(idx)
  } else {
    openGroups.value.add(idx)
  }
  // Force reactivity
  openGroups.value = new Set(openGroups.value)
}

function expandAllGroups(groups: Group[]) {
  openGroups.value = new Set(groups.map((_, i) => i))
}

function collapseAllGroups() {
  openGroups.value = new Set()
}
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
        </h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
        <div class="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            class="text-sm text-fg-muted underline hover:text-fg"
            @click="expandAllGroups(groups)"
          >
            {{ expandAll }}
          </button>
          <button
            type="button"
            class="text-sm text-fg-muted underline hover:text-fg"
            @click="collapseAllGroups"
          >
            {{ collapseAll }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="rounded-2xl border border-bone bg-white">
        <table class="w-full text-sm">
          <!-- Sticky header -->
          <thead class="sticky top-16 z-10 bg-white shadow-sm">
            <tr>
              <th class="w-1/3 px-6 py-4 text-left font-medium text-fg-muted"></th>
              <th
                v-for="(plan, idx) in planHeaders"
                :key="plan.name"
                :class="[
                  'w-1/5 px-4 py-4 text-center',
                  idx === 1 ? 'bg-navy-900 text-white' : '',
                ]"
              >
                <p class="font-semibold">
                  {{ plan.name }}
                  <span v-if="idx === 1" class="text-coral-400">★</span>
                </p>
                <p
                  :class="[
                    'mt-1 text-xs',
                    idx === 1 ? 'text-white/60' : 'text-fg-subtle',
                  ]"
                >
                  {{ plan.price }}
                </p>
                <BaseButton
                  href="/signup"
                  size="sm"
                  :class="[
                    'mt-2',
                    idx === 1
                      ? 'bg-white! text-navy-900! hover:bg-cream!'
                      : '',
                  ]"
                  :variant="idx === 1 ? 'primary' : 'secondary'"
                >
                  {{ plan.cta }}
                </BaseButton>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-bone">
            <!-- Group -->
            <template v-for="(group, gIdx) in groups" :key="group.title">
              <!-- Group header (accordion trigger) -->
              <tr
                class="cursor-pointer bg-cream/50 hover:bg-cream transition-colors"
                @click="toggleGroup(gIdx)"
              >
                <td colspan="4" class="px-6 py-3">
                  <div class="flex items-center gap-2">
                    <ChevronDownIcon
                      :class="[
                        'h-4 w-4 text-fg-muted transition-transform duration-200',
                        openGroups.has(gIdx) ? 'rotate-180' : '',
                      ]"
                    />
                    <span class="font-semibold text-fg">{{ group.title }}</span>
                  </div>
                </td>
              </tr>

              <!-- Group rows -->
              <template v-if="openGroups.has(gIdx)">
                <tr v-for="row in group.rows" :key="String(row[0])">
                  <td class="px-6 py-3 text-fg">{{ row[0] }}</td>
                  <td
                    v-for="(val, cIdx) in [row[1], row[2], row[3]]"
                    :key="cIdx"
                    :class="[
                      'px-4 py-3 text-center',
                      cIdx === 1 ? 'bg-navy-900/5' : '',
                    ]"
                  >
                    <CheckIcon
                      v-if="val === true"
                      :class="[
                        'mx-auto h-5 w-5',
                        cIdx === 1 ? 'text-coral-500' : 'text-mint-600',
                      ]"
                    />
                    <span
                      v-else-if="val === false"
                      class="text-fg-subtle"
                    >
                      —
                    </span>
                    <span v-else class="text-xs text-fg-muted">{{ val }}</span>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
