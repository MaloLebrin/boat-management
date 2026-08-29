<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useT } from '~/composables/use_t'
import type { BoatBrandOption, BoatModelOption } from '../../../../shared/types/boat_catalog'
import type { FormErrors } from '~/utils/form_errors'

/**
 * Identité du bateau (#571) : catégorie, constructeur et modèle.
 *
 * Les deux derniers sont des comboboxes alimentées par le catalogue, mais
 * **toute saisie hors catalogue reste acceptée** et part telle quelle au
 * serveur : les trois champs restent de simples champs de formulaire natifs,
 * sérialisés par le `<Form>` Inertia de la page.
 *
 * Les modèles de la marque retenue sont chargés par une visite Inertia
 * partielle (`router.reload({ only: ['catalogModels'] })`) — pas de `fetch`,
 * pas de route `/api`, pas de CSRF manuel.
 */
const category = defineModel<string>('category', { required: true })
const manufacturer = defineModel<string>('manufacturer', { required: true })
const model = defineModel<string>('model', { required: true })

const props = defineProps<{
  errors: FormErrors
  brands?: BoatBrandOption[]
  catalogModels?: BoatModelOption[]
  /**
   * Marque rapprochée côté serveur du `manufacturer` déjà saisi
   * (`BoatCatalogService.resolveBrand`) : à l'édition, la liste des modèles est
   * ainsi utile dès l'ouverture, sans aller-retour supplémentaire.
   */
  catalogBrandId?: number | null
}>()

const { t } = useT()
const { categoryOptions } = useBoatOptions()

/** Marque du catalogue retenue, si la saisie en désigne une. */
const selectedBrandId = ref<number | null>(props.catalogBrandId ?? null)

const brandOptions = computed<ComboboxOption[]>(() => {
  const brands = props.brands ?? []
  const chosen = category.value
  // La catégorie priorise les marques, elle ne les filtre jamais : un chantier
  // absent de la catégorie choisie doit rester proposé.
  const sorted = chosen
    ? [...brands].sort((a, b) => {
        const aIn = a.categories.includes(chosen as never) ? 0 : 1
        const bIn = b.categories.includes(chosen as never) ? 0 : 1
        return aIn !== bIn ? aIn - bIn : a.name.localeCompare(b.name)
      })
    : brands

  return sorted.map((brand) => ({
    value: String(brand.id),
    label: brand.name,
    hint: brand.categories.map((c) => t(`boats.options.category.${c}`)).join(' · '),
  }))
})

const modelOptions = computed<ComboboxOption[]>(() =>
  (props.catalogModels ?? []).map((m) => ({
    value: String(m.id),
    label: m.name,
    hint: t(`boats.options.category.${m.category}`),
  }))
)

function onBrandSelected(option: ComboboxOption) {
  const brandId = Number(option.value)
  selectedBrandId.value = brandId
  model.value = ''
  // `router.reload` préserve déjà le scroll et l'état du composant : c'est une
  // visite Inertia partielle, pas un `fetch`.
  router.reload({ only: ['catalogModels'], data: { brandId } })
}

// Une marque retapée à la main (ou effacée) invalide la liste de modèles
// chargée : on ne veut pas proposer les modèles d'un autre constructeur.
watch(manufacturer, (value) => {
  const brands = props.brands ?? []
  const stillMatches =
    selectedBrandId.value !== null &&
    brands.find((b) => b.id === selectedBrandId.value)?.name === value
  if (!stillMatches) selectedBrandId.value = null
})

const modelSuggestions = computed(() => (selectedBrandId.value === null ? [] : modelOptions.value))
</script>

<template>
  <div class="space-y-6">
    <BaseSelect
      id="category"
      name="category"
      :label="t('boats.hullFields.category')"
      :hint="t('boats.catalog.categoryHint')"
      :placeholder="t('boats.hullFields.selectPlaceholder')"
      :allow-empty="true"
      :options="categoryOptions"
      v-model="category"
      :errors="errors"
    />

    <div class="grid gap-4 sm:grid-cols-2">
      <BaseCombobox
        id="manufacturer"
        name="manufacturer"
        :label="t('boats.hullFields.manufacturer')"
        :placeholder="t('boats.catalog.brandPlaceholder')"
        :hint="t('boats.catalog.freeTextHint')"
        :empty-label="t('boats.catalog.noBrandMatch')"
        :options="brandOptions"
        v-model="manufacturer"
        :errors="errors"
        @select="onBrandSelected"
      />
      <BaseCombobox
        id="model"
        name="model"
        :label="t('boats.hullFields.model')"
        :placeholder="t('boats.catalog.modelPlaceholder')"
        :hint="
          selectedBrandId === null
            ? t('boats.catalog.modelNeedsBrandHint')
            : t('boats.catalog.freeTextHint')
        "
        :empty-label="t('boats.catalog.noModelMatch')"
        :options="modelSuggestions"
        v-model="model"
        :errors="errors"
      />
    </div>
  </div>
</template>
