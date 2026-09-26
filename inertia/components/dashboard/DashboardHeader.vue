<script setup lang="ts">
import { useT } from '~/composables/use_t'

const { t } = useT()
</script>

<template>
  <!-- En-tête allégé (#828) : titre + actions. Le lien « Bateaux → » (ghost,
       #419) a été retiré : la navigation vers la flotte est déjà portée par la
       sidebar, la bottom nav (#492), la carte KPI « Bateaux » et « Vos bateaux ·
       Voir tout » — sur mobile il prenait la place du CTA. -->
  <div class="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {{ t('dashboard.title') }}
      </h1>
      <p class="mt-2 hidden text-base text-fg-muted sm:block">{{ t('dashboard.subtitle') }}</p>
    </div>
    <!-- `ml-auto` : quand le groupe passe sous le titre (mobile), il reste calé à droite
         pour que le panneau du menu « + Créer » (ancré à droite) reste dans l'écran. -->
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
