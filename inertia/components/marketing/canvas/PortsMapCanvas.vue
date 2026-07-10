<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasLifecycle } from '~/composables/use_canvas_lifecycle'
import { createPortsMapRenderer, type PortsMapTheme } from './ports_map_renderer'

const props = withDefaults(
  defineProps<{
    /** `dark` : fond navy (points clairs). `light` : fond cream (points navy). */
    variant?: PortsMapTheme
    /** Intensité globale (opacité des points/arcs), 0–1. */
    intensity?: number
  }>(),
  { variant: 'dark', intensity: 0.6 }
)

const canvas = ref<HTMLCanvasElement | null>(null)

useCanvasLifecycle(canvas, (el) => createPortsMapRenderer(el, props.variant, props.intensity))
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none absolute inset-0 h-full w-full"
    aria-hidden="true"
  />
</template>
