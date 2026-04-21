<script setup lang="ts">
import BasePagination from '~/components/base/BasePagination.vue'
import type { BoatListMeta } from './types'

defineProps<{
  meta: BoatListMeta
}>()

defineEmits<{
  (e: 'update:page', value: number): void
}>()
</script>

<template>
  <BasePagination
    :page="meta.currentPage"
    :page-count="meta.lastPage"
    @update:page="$emit('update:page', $event)"
  />
</template>

