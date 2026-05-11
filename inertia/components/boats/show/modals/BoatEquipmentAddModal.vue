<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatEquipmentEngineFields from '~/components/boats/engine/BoatEquipmentEngineFields.vue'
import BoatEquipmentRigFields from '~/components/boats/rig/BoatEquipmentRigFields.vue'
import BoatEquipmentSailFields from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import type { BoatShowDetail } from '~/types/boat_show'

type Category = 'engine' | 'sail' | 'rig' | 'other'

const props = defineProps<{
  boat: BoatShowDetail
  canManageEquipment: boolean
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const selectedCategory = ref<Category>('engine')

const categories: Array<{ key: Category; label: string; icon: string; supported: boolean }> = [
  { key: 'engine', label: 'Moteur', icon: '⚙', supported: true },
  { key: 'sail', label: 'Voile', icon: '⛵', supported: true },
  { key: 'rig', label: 'Gréement', icon: '⚓', supported: true },
  { key: 'other', label: 'Autre', icon: '📦', supported: false },
]

const actionByCategory: Record<Exclude<Category, 'other'>, { url: string; method: 'post' | 'put' }> = {
  engine: { url: `/boats/${props.boat.id}/engines`, method: 'post' },
  sail: { url: `/boats/${props.boat.id}/sails`, method: 'post' },
  rig: { url: `/boats/${props.boat.id}/rig`, method: 'put' },
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal :open="open" title="Nouvel équipement"
    :subtitle="`Sur ${boat.name} · l'équipement deviendra suivable pour la maintenance`" close-label="Annuler" size="xl"
    @update:open="close">
    <!-- Category selector -->
    <div class="mb-5">
      <p class="mb-2 text-sm font-semibold text-fg">Catégorie <span class="text-danger">*</span></p>
      <div class="flex flex-wrap gap-2">
        <button v-for="cat in categories" :key="cat.key" type="button" :disabled="!cat.supported" :class="[
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          selectedCategory === cat.key
            ? 'bg-brand text-white'
            : cat.supported
              ? 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg'
              : 'cursor-not-allowed bg-surface-muted/50 text-fg-subtle',
        ]" @click="cat.supported && (selectedCategory = cat.key)">
          <span>{{ cat.icon }}</span>
          {{ cat.label }}
          <span v-if="!cat.supported" class="text-xs opacity-70">(bientôt)</span>
        </button>
      </div>
    </div>

    <!-- Coming soon notice -->
    <div v-if="selectedCategory === 'other'"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
      <p class="font-semibold">Catégorie bientôt disponible</p>
      <p class="mt-1 text-xs">Sélectionnez Moteur, Voile ou Gréement pour ajouter un équipement.</p>
    </div>

    <!-- Dynamic form by category -->
    <template v-else>
      <Form :action="actionByCategory[selectedCategory]" class="space-y-4" #default="{ processing, errors }">
        <BoatEquipmentEngineFields v-if="selectedCategory === 'engine'" :errors="errors" />
        <BoatEquipmentSailFields v-else-if="selectedCategory === 'sail'" :errors="errors" />
        <BoatEquipmentRigFields v-else-if="selectedCategory === 'rig'" :errors="errors" :rig="boat.rig" />

        <p v-if="selectedCategory === 'rig' && boat.rig" class="text-xs text-fg-muted">
          ⓘ Ce bateau a déjà un gréement — l'enregistrement mettra à jour les informations existantes.
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="close">Annuler</BaseButton>
          <BaseButton type="submit" :disabled="processing">
            Créer l'équipement
          </BaseButton>
        </div>
      </Form>
    </template>
  </BaseModal>
</template>
