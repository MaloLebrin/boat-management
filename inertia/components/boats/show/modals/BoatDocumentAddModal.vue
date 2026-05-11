<script setup lang="ts">
import { ref } from 'vue'
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import type { BoatShowDetail } from '~/types/boat_show'

type DocCategory = 'reglementaire' | 'assurance' | 'constructeur' | 'divers'

const props = defineProps<{
  boat: BoatShowDetail
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const selectedCategory = ref<DocCategory>('reglementaire')
const isDragging = ref(false)

const categories: Array<{ key: DocCategory; label: string }> = [
  { key: 'reglementaire', label: 'Réglementaire' },
  { key: 'assurance', label: 'Assurance' },
  { key: 'constructeur', label: 'Constructeur' },
  { key: 'divers', label: 'Divers' },
]

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Ajouter un document"
    :subtitle="`${boat.name} · Stocké chiffré`"
    close-label="Annuler"
    size="xl"
  >
    <div class="space-y-5">
      <!-- Coming soon banner -->
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Fonctionnalité à venir — la gestion des documents sera bientôt disponible.
      </div>

      <!-- Category selector -->
      <div>
        <p class="mb-2 text-sm font-semibold text-fg">Catégorie</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            :class="[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === cat.key
                ? 'bg-brand text-white'
                : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
            ]"
            @click="selectedCategory = cat.key"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Drop zone -->
      <div
        :class="[
          'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging ? 'border-brand bg-brand/5' : 'border-border bg-surface-muted/30',
        ]"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <DocumentArrowUpIcon class="mx-auto h-10 w-10 text-fg-subtle" />
        <p class="mt-3 font-semibold text-fg">Glisser les fichiers ici</p>
        <p class="mt-1 text-sm text-fg-muted">PDF, JPG, PNG, HEIC · max 25 Mo par fichier</p>
        <BaseButton variant="secondary" size="sm" class="mt-4" disabled>
          Parcourir…
        </BaseButton>
      </div>

      <!-- Link to entity -->
      <div>
        <p class="mb-2 text-sm font-semibold text-fg">Lier à</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="link in ['Aucun', 'Un équipement', 'Un événement', 'Une tâche']"
            :key="link"
            type="button"
            class="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-fg-muted"
            disabled
          >
            {{ link }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">Annuler</BaseButton>
        <BaseButton disabled>Téléverser</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
