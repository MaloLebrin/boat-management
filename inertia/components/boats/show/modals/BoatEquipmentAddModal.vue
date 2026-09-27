<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { useRemember } from '@inertiajs/vue3'
import {
  AdjustmentsVerticalIcon,
  BoltIcon,
  Cog6ToothIcon,
  FireIcon,
  FlagIcon,
  HomeModernIcon,
  LifebuoyIcon,
  LinkIcon,
  MapPinIcon,
  PuzzlePieceIcon,
  Square3Stack3DIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref, watch, type Component, type Ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatEquipmentEngineFields from '~/components/boats/engine/BoatEquipmentEngineFields.vue'
import BoatGenericEquipmentFields from '~/components/boats/equipment/BoatGenericEquipmentFields.vue'
import BoatEquipmentRigFields from '~/components/boats/rig/BoatEquipmentRigFields.vue'
import BoatSafetyEquipmentFields from '~/components/boats/safety/BoatSafetyEquipmentFields.vue'
import BoatEquipmentSailFields from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import { shouldReopenGenericEquipmentForm } from '~/composables/use_generic_equipment_form_draft'
import { useT } from '~/composables/use_t'
import {
  GENERIC_EQUIPMENT_CATEGORIES,
  isGenericEquipmentCategory,
  type GenericEquipmentCategory,
} from '#shared/types/boat'
import type { BoatShowDetail } from '~/types/boat_show'

type Category = 'engine' | 'sail' | 'rig' | 'safety' | GenericEquipmentCategory

const props = defineProps<{
  boat: BoatShowDetail
  canManageEquipment: boolean
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

/** Identifie cette modale dans l'URL de l'aller-retour catalogue (#573, #577). */
const ENGINE_FORM_SURFACE = 'equipment-add'

const { t } = useT()

// Au retour d'un aller-retour catalogue, la modale se remonte : la catégorie
// choisie est restaurée depuis l'historique Inertia (#577) — pour le moteur
// elle est déjà la valeur par défaut.
// `useRemember` se déclare `T | Ref<T>` (son repli SSR) mais rend toujours un
// `Ref` — même cast explicite que `use_catalog_form_draft`.
const rememberedCategory = useRemember(
  { category: 'engine' as Category },
  'boat-equipment-add-modal'
) as Ref<{ category: Category }>
const selectedCategory = ref<Category>(
  shouldReopenGenericEquipmentForm(ENGINE_FORM_SURFACE)
    ? rememberedCategory.value.category
    : 'engine'
)
watch(selectedCategory, (category) => {
  rememberedCategory.value = { category }
})

const CATEGORY_ICONS: Record<Category, Component> = {
  engine: Cog6ToothIcon,
  sail: FlagIcon,
  rig: AdjustmentsVerticalIcon,
  safety: LifebuoyIcon,
  navigation: MapPinIcon,
  electrical: BoltIcon,
  anchoring: LinkIcon,
  deck: Square3Stack3DIcon,
  energy: FireIcon,
  comfort: HomeModernIcon,
  plumbing: WrenchScrewdriverIcon,
  other: PuzzlePieceIcon,
}

const categories = computed(() => [
  ...(['engine', 'sail', 'rig', 'safety'] as const).map((key) => ({
    key,
    label: t(`boats.equipmentAddModal.categories.${key}`),
    icon: CATEGORY_ICONS[key],
  })),
  // Les catégories d'équipement générique suivent la constante partagée : le
  // validator, la carte Équipements et cette modale voient la même liste —
  // « Autre » compris : c'est un équipement générique `category: 'other'` (#893).
  ...GENERIC_EQUIPMENT_CATEGORIES.map((key) => ({
    key,
    label: t(`boats.equipmentAddModal.categories.${key}`),
    icon: CATEGORY_ICONS[key],
  })),
])

const isGenericCategory = computed(() => isGenericEquipmentCategory(selectedCategory.value))

const genericAction = { url: `/boats/${props.boat.id}/generic-equipment`, method: 'post' } as const

const actionByCategory: Record<Category, { url: string; method: 'post' | 'put' }> = {
  engine: { url: `/boats/${props.boat.id}/engines`, method: 'post' },
  sail: { url: `/boats/${props.boat.id}/sails`, method: 'post' },
  rig: { url: `/boats/${props.boat.id}/rig`, method: 'put' },
  safety: { url: `/boats/${props.boat.id}/safety-equipment`, method: 'post' },
  navigation: genericAction,
  electrical: genericAction,
  anchoring: genericAction,
  deck: genericAction,
  energy: genericAction,
  comfort: genericAction,
  plumbing: genericAction,
  other: genericAction,
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('boats.equipmentAddModal.title')"
    :subtitle="t('boats.equipmentAddModal.subtitle', { name: boat.name })"
    :close-label="t('boats.equipmentAddModal.cancel')"
    size="xl"
    @update:open="close"
  >
    <!-- Category selector -->
    <div class="mb-5">
      <p class="mb-2 text-sm font-semibold text-fg">
        {{ t('boats.equipmentAddModal.category') }} <span class="text-danger">*</span>
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          :class="[
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            selectedCategory === cat.key
              ? 'bg-brand text-on-brand'
              : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
          ]"
          @click="selectedCategory = cat.key"
        >
          <component :is="cat.icon" class="h-4 w-4" aria-hidden="true" />
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Dynamic form by category -->
    <Form
      :action="actionByCategory[selectedCategory]"
      @success="close"
      class="space-y-4"
      #default="{ processing, errors }"
    >
      <BoatEquipmentEngineFields
        v-if="selectedCategory === 'engine'"
        :errors="errors"
        :surface="ENGINE_FORM_SURFACE"
      />
      <BoatEquipmentSailFields v-else-if="selectedCategory === 'sail'" :errors="errors" />
      <BoatEquipmentRigFields
        v-else-if="selectedCategory === 'rig'"
        :errors="errors"
        :rig="boat.rig"
      />
      <BoatSafetyEquipmentFields v-else-if="selectedCategory === 'safety'" :errors="errors" />
      <BoatGenericEquipmentFields
        v-else-if="isGenericCategory"
        :errors="errors"
        :initial-category="selectedCategory as GenericEquipmentCategory"
        category-locked
        :surface="ENGINE_FORM_SURFACE"
      />

      <p v-if="selectedCategory === 'rig' && boat.rig" class="text-xs text-fg-muted">
        {{ t('boats.equipmentAddModal.rigNotice') }}
      </p>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">{{
          t('boats.equipmentAddModal.cancel')
        }}</BaseButton>
        <BaseButton type="submit" :disabled="processing">
          {{ t('boats.equipmentAddModal.submit') }}
        </BaseButton>
      </div>
    </Form>
  </BaseModal>
</template>
