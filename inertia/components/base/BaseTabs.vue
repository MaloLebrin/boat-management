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
  <div class="relative w-full">
    <div
      ref="scrollRef"
      class="relative flex overflow-x-auto rounded-(--radius-card) border border-border bg-surface-muted p-1 shadow-(--shadow-xs) scrollbar-none"
    >
      <!-- Sliding pill indicator -->
      <div
        class="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-(--radius-control) bg-surface-elevated shadow-(--shadow-sm) transition-[left,width,opacity] duration-(--motion-normal) ease-premium"
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
          'relative z-10 inline-flex shrink-0 items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm whitespace-nowrap transition-colors duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed',
          tab.key === modelValue
            ? 'font-semibold text-fg cursor-default'
            : 'font-medium text-fg-subtle hover:text-fg-muted cursor-pointer',
        ]"
        @click="$emit('update:modelValue', tab.key)"
      >
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge"
          class="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700 ring-1 ring-navy-200"
        >
          {{ tab.badge }}
        </span>
      </button>
    </div>
  </div>
</template>
