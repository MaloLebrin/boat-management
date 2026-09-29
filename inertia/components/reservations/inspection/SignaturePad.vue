<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { SIGNATURE_INK_COLOR } from '#shared/constants/inspection_signature'

/**
 * Pad de signature manuscrite (#889) : doigt, stylet ou souris. Le modèle
 * vaut l'URL `data:` PNG du tracé, `null` tant qu'il est vide.
 */
const props = defineProps<{
  id: string
  label: string
  hint?: string
  error?: string
  disabled?: boolean
}>()

const model = defineModel<string | null>({ default: null })

const { t } = useT()

/** Taille de repli quand le canvas n'a pas encore de mise en page (tests, SSR). */
const FALLBACK_WIDTH = 600
const HEIGHT = 180

const canvas = ref<HTMLCanvasElement | null>(null)
let drawing = false
let last: { x: number; y: number } | null = null

function context(): CanvasRenderingContext2D | null {
  return canvas.value?.getContext('2d') ?? null
}

onMounted(() => {
  const element = canvas.value
  const ctx = context()
  if (!element || !ctx) return
  const ratio = window.devicePixelRatio || 1
  const width = element.clientWidth || FALLBACK_WIDTH
  element.width = width * ratio
  element.height = HEIGHT * ratio
  ctx.scale(ratio, ratio)
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = SIGNATURE_INK_COLOR
})

function point(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function start(event: PointerEvent) {
  if (props.disabled || !canvas.value) return
  drawing = true
  canvas.value.setPointerCapture?.(event.pointerId)
  last = point(event)
  // Un simple point (paraphe, accent) doit laisser une trace.
  const ctx = context()
  ctx?.beginPath()
  ctx?.arc(last.x, last.y, 1.1, 0, Math.PI * 2)
  ctx?.stroke()
}

function move(event: PointerEvent) {
  if (!drawing || !last) return
  const ctx = context()
  const next = point(event)
  ctx?.beginPath()
  ctx?.moveTo(last.x, last.y)
  ctx?.lineTo(next.x, next.y)
  ctx?.stroke()
  last = next
}

function end() {
  if (!drawing) return
  drawing = false
  last = null
  model.value = canvas.value?.toDataURL('image/png') ?? null
}

function clear() {
  const element = canvas.value
  context()?.clearRect(0, 0, element?.width ?? 0, element?.height ?? 0)
  model.value = null
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <span :id="`${id}-label`" class="text-sm font-medium text-fg">{{ label }}</span>
      <BaseButton
        variant="ghost"
        size="sm"
        type="button"
        :disabled="disabled || !model"
        @click="clear"
      >
        {{ t('inspections.signature.clear') }}
      </BaseButton>
    </div>
    <!-- Le pad figure une feuille : il reste clair dans les deux thèmes, comme
         le papier du PDF où finit le tracé (navy-25 ne s'inverse pas). -->
    <canvas
      :id="id"
      ref="canvas"
      role="img"
      :aria-labelledby="`${id}-label`"
      :class="[
        'block h-[180px] w-full touch-none rounded-md border bg-navy-25',
        error ? 'border-danger' : 'border-border',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair',
      ]"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointerleave="end"
      @pointercancel="end"
    />
    <p v-if="error" class="text-xs text-danger" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-fg-subtle">{{ hint }}</p>
  </div>
</template>
