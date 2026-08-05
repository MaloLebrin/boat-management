<script setup lang="ts">
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import DefaultLayout from '~/layouts/default.vue'
import PublicLayout from '~/layouts/public.vue'

/**
 * Layout des pages d'erreur (403/404/500).
 *
 * Un utilisateur connecté qui tombe sur une erreur doit garder la coquille de
 * l'app (sidebar, notifications) : sinon il « perd » toute l'application et se
 * retrouve sur l'habillage marketing, déroutant en session authentifiée (#458).
 * Un visiteur anonyme, lui, garde le layout public.
 */
const page = usePage<Data.SharedProps>()

const layout = computed(() => (page.props.user ? DefaultLayout : PublicLayout))
</script>

<template>
  <component :is="layout">
    <slot />
  </component>
</template>
