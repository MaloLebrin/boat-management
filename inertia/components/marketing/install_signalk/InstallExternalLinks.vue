<script setup lang="ts">
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid'
import type { InstallSignalKExternalLink } from '#shared/types/marketing_install_signalk'

/**
 * Liens officiels (fabricant, documentation) : sites externes ouverts dans un
 * nouvel onglet. Ancres brutes à dessein — `<Link>` ignore `target` et une
 * visite Inertia n'a aucun sens hors du site.
 */
defineProps<{
  label?: string
  links: InstallSignalKExternalLink[]
}>()
</script>

<template>
  <div v-if="links.length" class="flex flex-wrap items-center gap-2" data-testid="install-links">
    <span v-if="label" class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
      {{ label }}
    </span>
    <!-- eslint-disable vue/no-restricted-v-bind -- liens externes (fabricants, documentation), jamais un chemin interne -->
    <a
      v-for="link in links"
      :key="link.href"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg hover:border-coral-400 hover:text-coral-700"
      data-testid="install-external-link"
    >
      {{ link.label }}
      <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
    <!-- eslint-enable vue/no-restricted-v-bind -->
  </div>
</template>
