<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/24/outline'

export interface BreadcrumbItem {
  label: string
  href?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<template>
  <nav class="mb-4 flex items-center gap-1 text-sm text-fg-muted" aria-label="Breadcrumb">
    <template v-for="(item, index) in items" :key="index">
      <ChevronRightIcon v-if="index > 0" class="h-4 w-4 shrink-0" aria-hidden="true" />
      <a v-if="item.href" :href="item.href" class="hover:text-fg hover:underline">{{ item.label }}</a>
      <span v-else :class="index === items.length - 1 ? 'text-fg' : ''">{{ item.label }}</span>
    </template>
  </nav>
</template>
