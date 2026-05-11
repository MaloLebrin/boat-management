<script setup lang="ts">
type TabItem = { key: string; label: string; badge?: string }

withDefaults(
  defineProps<{
    tabs: TabItem[]
    modelValue: string
  }>(),
  {}
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="inline-flex rounded-(--radius-card) border border-border bg-surface-elevated p-1 shadow-(--shadow-xs)">
    <button v-for="tab in tabs" :key="tab.key" type="button" :class="[
      'relative inline-flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30  disabled:opacity-50 disabled:cursor-not-allowed',
      tab.key === modelValue
        ? 'bg-surface-muted text-fg shadow-(--shadow-xs) cursor-default'
        : 'text-fg-muted hover:bg-lilac-100/60 hover:text-fg cursor-pointer',
    ]" @click="$emit('update:modelValue', tab.key)">
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge"
        class="rounded-full bg-lilac-100 px-2 py-0.5 text-xs font-semibold text-lilac-800 ring-1 ring-lilac-200">
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>
