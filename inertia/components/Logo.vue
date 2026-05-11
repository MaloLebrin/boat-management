<template>
  <Link href="/dashboard" class="flex items-center gap-3">
    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-lilac-50">
      <img :src="brandIconUrl" alt="FleetAi" class="h-10 w-10 rounded-lg shadow-md" />
    </div>
    <div class="flex flex-col leading-tight">
      <span class="font-display text-base font-semibold text-white">FleetAi</span>
      <span class="text-xs font-medium text-abyss-300">Fleet intelligence</span>
    </div>
  </Link>
</template>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue';
import brandIconUrl from '~/assets/brand/fleetai_compass.svg';
</script>
