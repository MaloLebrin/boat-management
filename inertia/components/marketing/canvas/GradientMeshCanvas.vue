<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasLifecycle } from '~/composables/use_canvas_lifecycle'
import { createBlobMeshRenderer } from './mesh_gradient_2d'
import type { MeshVariant } from './mesh_gradient_shared'
import { createWebglMeshRenderer } from './mesh_gradient_webgl'

const props = withDefaults(
  defineProps<{
    variant?: MeshVariant
    /** Intensité globale (opacité du dégradé), 0–1. */
    intensity?: number
  }>(),
  { variant: 'navy', intensity: 0.55 }
)

const canvas = ref<HTMLCanvasElement | null>(null)

// Chaîne de repli : shader WebGL (technique stripe.com) → blobs canvas 2D
// → fond CSS de la section (si les deux contextes sont indisponibles).
const lifecycleOptions = { maxDpr: 2 }
useCanvasLifecycle(
  canvas,
  (el) => {
    const webgl = createWebglMeshRenderer(el, props.variant, props.intensity)
    if (webgl) {
      // Le coût du fragment shader croît avec les pixels : 1.5 suffit
      // largement pour un dégradé doux.
      lifecycleOptions.maxDpr = 1.5
      return webgl
    }
    return createBlobMeshRenderer(el, props.variant, props.intensity)
  },
  lifecycleOptions
)
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
  />
</template>
