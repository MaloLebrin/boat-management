<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BoatGenericEquipmentIdentityFields from './BoatGenericEquipmentIdentityFields.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useEquipmentCatalog } from '~/composables/use_equipment_catalog'
import { useGenericEquipmentFormDraft } from '~/composables/use_generic_equipment_form_draft'
import { isGenericEquipmentCategory, type GenericEquipmentCategory } from '#shared/types/boat'
import { useT } from '~/composables/use_t'
import type { BoatShowGenericEquipment } from '~/types/boat_show'

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  /** Équipement édité — absent en création (brouillon « new »). */
  item?: BoatShowGenericEquipment | null
  /** Catégorie initiale en création ; ignorée quand `item` la porte. */
  initialCategory?: GenericEquipmentCategory
  /**
   * La catégorie est choisie par l'écran parent (pastilles de la modale
   * d'ajout) : le champ devient un input caché au lieu d'un select — la
   * catégorie reste éditable partout ailleurs (#577).
   */
  categoryLocked?: boolean
  /** Surface d'origine quand le formulaire est monté dans une modale. */
  surface?: string | null
}>()

const { t } = useT()
const { genericEquipmentStatusOptions, genericEquipmentCategoryOptions } = useBoatOptions()
// Catalogue d'équipements (#577) : lu dans les props de la page, pas passé de
// main en main — ce formulaire est monté depuis plusieurs écrans sous la fiche
// bateau.
const { brands, catalogModels, catalogBrandId } = useEquipmentCatalog()

const name = ref('')
const brand = ref('')
const model = ref('')
const quantity = ref('')
const status = ref('ok')
const notes = ref('')
const purchasePrice = ref('')
const purchasedAt = ref('')
const category = ref<string>('navigation')

function syncFromProps() {
  const item = props.item
  name.value = item?.name ?? ''
  brand.value = item?.brand ?? ''
  model.value = item?.model ?? ''
  quantity.value =
    item?.quantity === null || item?.quantity === undefined ? '' : String(item.quantity)
  status.value = item?.status ?? 'ok'
  notes.value = item?.notes ?? ''
  purchasePrice.value = ''
  purchasedAt.value = ''
  category.value = item?.category ?? props.initialCategory ?? 'navigation'
}

useGenericEquipmentFormDraft(
  String(props.item?.id ?? 'new'),
  { name, brand, model, quantity, status, notes, purchasePrice, purchasedAt, category },
  syncFromProps
)

// On resynchronise sur l'**identité** de l'équipement, pas sur la référence
// des props : ces dernières changent à chaque visite partielle.
watch(() => props.item?.id, syncFromProps)

// Quand la catégorie est verrouillée, c'est le parent qui la pilote (pastilles
// de la modale d'ajout) : le champ caché et la priorisation des marques la
// suivent en direct.
watch(
  () => props.initialCategory,
  (value) => {
    if (props.categoryLocked && value) category.value = value
  }
)

/** Catégorie courante, pour prioriser les marques du catalogue. */
const catalogCategory = computed<GenericEquipmentCategory | null>(() =>
  isGenericEquipmentCategory(category.value) ? category.value : null
)
</script>

<template>
  <div class="space-y-4">
    <input v-if="categoryLocked" type="hidden" name="category" :value="category" />
    <BaseSelect
      v-else
      id="category"
      name="category"
      :label="t('boats.genericEquipment.category')"
      :options="genericEquipmentCategoryOptions"
      v-model="category"
      :errors="errors"
    />
    <BaseInput
      id="name"
      name="name"
      :label="t('boats.genericEquipment.name.label')"
      :placeholder="t('boats.genericEquipment.name.placeholder')"
      v-model="name"
      :errors="errors"
      required
    />
    <div class="grid grid-cols-2 gap-4">
      <BoatGenericEquipmentIdentityFields
        v-model:brand="brand"
        v-model:model="model"
        :errors="errors"
        :brands="brands"
        :catalog-models="catalogModels"
        :catalog-brand-id="catalogBrandId"
        :equipment-model-id="item?.equipmentModelId ?? null"
        :category="catalogCategory"
        :surface="surface"
      />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="quantity"
        name="quantity"
        :label="t('boats.genericEquipment.quantity')"
        type="number"
        inputmode="numeric"
        v-model="quantity"
        :errors="errors"
      />
      <BaseSelect
        id="status"
        name="status"
        :label="t('boats.genericEquipment.status')"
        :options="genericEquipmentStatusOptions"
        v-model="status"
        :errors="errors"
      />
    </div>
    <BaseInput
      id="notes"
      name="notes"
      :label="t('equipment.notes.label')"
      :placeholder="t('equipment.notes.placeholder')"
      v-model="notes"
      :errors="errors"
    />
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="purchasePrice"
        name="purchasePrice"
        :label="t('equipment.purchasePrice.label')"
        type="number"
        step="0.01"
        min="0"
        v-model="purchasePrice"
        :errors="errors"
      />
      <BaseInput
        id="purchasedAt"
        name="purchasedAt"
        :label="t('equipment.purchasedAt.label')"
        type="date"
        v-model="purchasedAt"
        :errors="errors"
      />
    </div>
  </div>
</template>
