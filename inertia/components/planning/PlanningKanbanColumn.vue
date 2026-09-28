<script setup lang="ts">
/**
 * Colonne du kanban (#869) : en-tête teinté, compteur, état vide, et — quand
 * `dropZone` est fourni — zone de dépôt du glisser-déposer
 * (`data-drop-zone`, lue par `usePointerDrag`).
 */
defineProps<{
  title: string
  count: number
  emptyLabel: string
  headerClass: string
  titleClass: string
  countClass: string
  dropZone?: string
  /** Une carte glissée survole la colonne. */
  dropActive?: boolean
  /** Un glisser est en cours : les colonnes cibles se signalent. */
  dropArmed?: boolean
}>()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg transition-shadow"
    :class="
      dropZone && dropArmed
        ? [
            'outline-2 outline-dashed outline-offset-4',
            dropActive ? 'bg-brand-soft/40 outline-brand' : 'outline-border',
          ]
        : ''
    "
    :data-drop-zone="dropZone"
    :data-testid="dropZone ? `planning-drop-${dropZone}` : undefined"
  >
    <div class="flex items-center gap-2 rounded-lg border-l-4 px-3 py-2" :class="headerClass">
      <h2 class="text-sm font-semibold" :class="titleClass">{{ title }}</h2>
      <span
        class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
        :class="countClass"
      >
        {{ count }}
      </span>
    </div>
    <div
      v-if="count === 0"
      class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
    >
      {{ emptyLabel }}
    </div>
    <slot />
  </div>
</template>
