<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

type TabItem = { key: string; label: string; badge?: string }

const props = withDefaults(
  defineProps<{
    tabs: TabItem[]
    modelValue: string
  }>(),
  {}
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const scrollRef = ref<HTMLElement | null>(null)
const buttonRefs = ref<HTMLButtonElement[]>([])
const indicator = ref({ left: '0px', width: '0px', opacity: '0' })

function updateIndicator() {
  const activeIndex = props.tabs.findIndex((t) => t.key === props.modelValue)
  if (activeIndex === -1 || !buttonRefs.value[activeIndex]) return
  const btn = buttonRefs.value[activeIndex]
  indicator.value = {
    left: `${btn.offsetLeft}px`,
    width: `${btn.offsetWidth}px`,
    opacity: '1',
  }
  btn.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

watch(
  () => props.modelValue,
  () => nextTick(updateIndicator)
)
onMounted(() => nextTick(updateIndicator))
</script>

<template>
  <!-- Outer wrapper provides gradient fade edges on mobile scroll -->
  <div class="relative w-full">
    <div
      class="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-surface to-transparent"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-surface to-transparent"
      aria-hidden="true"
    />

    <div
      ref="scrollRef"
      class="relative flex overflow-x-auto rounded-(--radius-card) border border-border bg-surface-elevated p-1 shadow-(--shadow-xs) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <!-- Sliding pill indicator -->
      <div
        class="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-(--radius-control) bg-surface-muted shadow-(--shadow-xs) transition-[left,width,opacity] duration-(--motion-normal) ease-premium"
        :style="indicator"
        aria-hidden="true"
      />
      <button
        v-for="(tab, i) in tabs"
        :key="tab.key"
        :ref="
          (el) => {
            if (el) buttonRefs[i] = el as HTMLButtonElement
          }
        "
        type="button"
        :class="[
          'relative z-10 inline-flex shrink-0 items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed',
          tab.key === modelValue
            ? 'text-fg cursor-default'
            : 'text-fg-muted hover:text-fg cursor-pointer',
        ]"
        @click="$emit('update:modelValue', tab.key)"
      >
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge"
          class="rounded-full bg-lilac-100 px-2 py-0.5 text-xs font-semibold text-lilac-800 ring-1 ring-lilac-200"
        >
          {{ tab.badge }}
        </span>
      </button>
    </div>
  </div>
</template>
