<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { SPARE_PART_ASSEMBLIES } from '#shared/constants/spare_parts/spare_parts_content'
import { useT } from '~/composables/use_t'

defineProps<{
  boatId: number
  engineId: number
}>()

const { t } = useT()

const assemblies = Object.values(SPARE_PART_ASSEMBLIES)
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Link
      v-for="assembly in assemblies"
      :key="assembly.slug"
      :href="`/boats/${boatId}/engines/${engineId}/spare-parts/assemblies/${assembly.slug}`"
      class="group rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <h3 class="font-semibold text-fg group-hover:text-brand">{{ t(assembly.labelKey) }}</h3>
      <p class="mt-0.5 font-mono text-xs uppercase tracking-wide text-fg-muted">
        {{ assembly.catalogLabel }}
      </p>
      <p class="mt-2 text-sm text-fg-muted">{{ t(assembly.descriptionKey) }}</p>
    </Link>
  </div>
</template>
