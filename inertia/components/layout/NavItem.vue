<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import NavIcon from '~/components/layout/NavIcon.vue'

defineProps<{
  name: string
  path: string
  route?: string | null
  icon: string
  isActive?: boolean
}>()
</script>

<template>
  <component
    :is="route ? Link : 'a'"
    v-bind="route ? { route } : { href: path }"
    class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
    :class="
      isActive ? 'bg-navy-700 text-white' : 'text-navy-100 hover:bg-navy-700 hover:text-white'
    "
  >
    <span
      v-if="isActive"
      class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-navy-500 rounded-r"
    />
    <NavIcon :name="icon" />
    <span>{{ name }}</span>
  </component>
</template>
