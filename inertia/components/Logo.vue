<template>
  <Link href="/dashboard" class="flex items-center gap-3">
    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-lilac-50 shadow-md">
      <svg
        class="h-10 w-10"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="FleetAi"
      >
        <circle cx="32" cy="32" r="28" stroke="#0b1d2e" stroke-width="2.6" />
        <g class="compass-needle">
          <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#0b1d2e" />
          <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
        </g>
        <circle cx="32" cy="32" r="2.4" fill="#faf6ee" stroke="#0b1d2e" stroke-width="1.4" />
      </svg>
    </div>
    <div class="flex flex-col leading-tight">
      <span class="font-display text-base font-semibold text-white">FleetAi</span>
      <span class="text-xs font-medium text-navy-200">Fleet intelligence</span>
    </div>
  </Link>
</template>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
</script>

<style scoped>
.compass-needle {
  transform-box: fill-box;
  transform-origin: center;
  animation: compass-spin 8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .compass-needle {
    animation: none;
  }
}

@keyframes compass-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
