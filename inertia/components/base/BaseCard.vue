<script setup lang="ts">
defineProps<{
  padded?: boolean
}>()
</script>

<template>
  <div class="group perspective-[60rem]">
    <div
      class="rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card) hover:shadow-(--shadow-card-hover) transition-[rotate,scale,box-shadow] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:rotate-[y_10deg] group-hover:scale-[1.05]"
    >
      <div v-if="$slots.header" class="px-6 py-4 border-b border-border">
        <slot name="header" />
      </div>
      <div :class="padded !== false ? 'px-6 py-5' : ''">
        <slot />
      </div>
      <div v-if="$slots.footer" class="px-6 py-4 border-t border-border">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
