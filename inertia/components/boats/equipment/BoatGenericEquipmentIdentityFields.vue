<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import { useT } from '~/composables/use_t'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import type { EquipmentBrandOption, EquipmentModelOption } from '#shared/types/equipment_catalog'
import type { FormErrors } from '~/utils/form_errors'

/**
 * Identité de l'équipement (#577) : marque et modèle, assistés par le
 * catalogue — décalque de `BoatEngineIdentityFields` (#573).
 *
 * **Toute saisie hors catalogue reste acceptée** et part telle quelle au
 * serveur : les deux champs restent de simples champs de formulaire natifs,
 * sérialisés par le `<Form>` Inertia de la page, et `brand`/`model` demeurent
 * la source de vérité. `equipmentModelId` n'est qu'un rattachement facultatif.
 *
 * Les modèles de la marque retenue sont chargés par une visite Inertia
 * partielle (`router.reload({ only: ['equipmentCatalogModels'] })`) — pas de
 * `fetch`, pas de route `/api`, pas de CSRF manuel.
 */
const brand = defineModel<string>('brand', { required: true })
const model = defineModel<string>('model', { required: true })

const props = defineProps<{
  errors: FormErrors
  brands?: EquipmentBrandOption[]
  catalogModels?: EquipmentModelOption[]
  /**
   * Marque rapprochée côté serveur du `brand` déjà saisi
   * (`EquipmentCatalogService.resolveBrand`), quand la page la connaît.
   */
  catalogBrandId?: number | null
  /** Modèle déjà rattaché, à réémettre tant que la saisie ne change pas. */
  equipmentModelId?: number | null
  /**
   * Catégorie de l'équipement saisi : les marques qui la couvrent passent en
   * tête de liste, sous un intitulé de section. Elle **priorise**, elle ne
   * filtre pas — les autres marques restent proposées juste en dessous, et une
   * saisie hors catalogue reste acceptée.
   */
  category?: GenericEquipmentCategory | null
  /**
   * Surface d'origine, quand le formulaire est monté dans une modale : elle
   * voyage dans l'URL du rechargement partiel pour que la modale se rouvre
   * après le remontage (cf. `shouldReopenGenericEquipmentForm`).
   */
  surface?: string | null
}>()

const { t } = useT()

/** Marque du catalogue retenue, si la saisie en désigne une. */
const selectedBrandId = ref<number | null>(props.catalogBrandId ?? null)
/** Rattachement effectif envoyé au serveur — vidé dès que la saisie diverge. */
const selectedModelId = ref<number | null>(props.equipmentModelId ?? null)

/** Cette marque couvre-t-elle la catégorie de l'équipement saisi ? */
function matchesCategory(candidate: EquipmentBrandOption): boolean {
  return props.category != null && candidate.categories.includes(props.category)
}

/**
 * Les marques, celles de la catégorie de l'équipement d'abord : sans cette
 * remontée, une marque hors du début de l'alphabet resterait noyée dans une
 * liste de plus de cent entrées. Les autres restent accessibles sous « autres
 * marques », et n'importe quelle saisie libre passe.
 */
const brandOptions = computed<ComboboxOption[]>(() => {
  const brands = props.brands ?? []

  const toOption = (b: EquipmentBrandOption, group?: string): ComboboxOption => ({
    value: String(b.id),
    label: b.name,
    hint: b.categories.map((c) => t(`boats.options.genericEquipmentCategory.${c}`)).join(' · '),
    // Les alias du catalogue rendent la liste aussi tolérante que
    // `resolveBrand` côté serveur : `waeco`, `autohelm` remontent leur marque.
    keywords: b.aliases,
    group,
  })

  if (props.category == null) return brands.map((b) => toOption(b))

  return [
    ...brands
      .filter((b) => matchesCategory(b))
      .map((b) => toOption(b, t('boats.genericEquipment.catalog.brandGroupForCategory'))),
    ...brands
      .filter((b) => !matchesCategory(b))
      .map((b) => toOption(b, t('boats.genericEquipment.catalog.brandGroupOther'))),
  ]
})

const modelOptions = computed<ComboboxOption[]>(() =>
  selectedBrandId.value === null
    ? []
    : (props.catalogModels ?? []).map((m) => ({
        value: String(m.id),
        label: m.name,
        hint: t(`boats.options.genericEquipmentCategory.${m.category}`),
      }))
)

function onBrandSelected(option: ComboboxOption) {
  const brandId = Number(option.value)
  selectedBrandId.value = brandId
  model.value = ''
  selectedModelId.value = null
  // Visite Inertia partielle, pas un `fetch`. `equipmentCatalogBrandId` fait
  // partie du rechargement : la visite remonte l'arbre, et c'est le serveur qui
  // réapprend au formulaire quelle marque est retenue.
  router.reload({
    only: ['equipmentCatalogModels', 'equipmentCatalogBrandId'],
    data: props.surface
      ? { equipmentBrandId: brandId, equipmentForm: props.surface }
      : { equipmentBrandId: brandId },
    preserveScroll: true,
  })
}

function onModelSelected(option: ComboboxOption) {
  selectedModelId.value = Number(option.value)
}

// Une marque retapée à la main (ou effacée) invalide la liste de modèles
// chargée et le rattachement : on ne veut pas proposer les modèles d'une autre
// marque, ni conserver une clé étrangère qui ne correspond plus.
watch(brand, (value) => {
  const stillMatches =
    selectedBrandId.value !== null &&
    (props.brands ?? []).find((b) => b.id === selectedBrandId.value)?.name === value
  if (!stillMatches) {
    selectedBrandId.value = null
    selectedModelId.value = null
  }
})

watch(model, (value) => {
  const stillMatches =
    selectedModelId.value !== null &&
    (props.catalogModels ?? []).find((m) => m.id === selectedModelId.value)?.name === value
  if (!stillMatches) selectedModelId.value = null
})

// Le serveur rapproche la marque au rendu : un équipement déjà en base doit
// retrouver sa marque et son modèle sans que l'utilisateur retape quoi que ce
// soit.
watch(
  () => props.catalogBrandId,
  (value) => {
    if (value != null) selectedBrandId.value = value
  }
)
</script>

<template>
  <BaseCombobox
    id="brand"
    name="brand"
    :label="t('boats.genericEquipment.brand.label')"
    :placeholder="t('boats.genericEquipment.brand.placeholder')"
    :hint="t('boats.genericEquipment.catalog.freeTextHint')"
    :empty-label="t('boats.genericEquipment.catalog.noBrandMatch')"
    :options="brandOptions"
    v-model="brand"
    :errors="errors"
    @select="onBrandSelected"
  />
  <BaseCombobox
    id="model"
    name="model"
    :label="t('boats.genericEquipment.model.label')"
    :placeholder="t('boats.genericEquipment.model.placeholder')"
    :hint="
      selectedBrandId === null
        ? t('boats.genericEquipment.catalog.modelNeedsBrandHint')
        : t('boats.genericEquipment.catalog.freeTextHint')
    "
    :empty-label="t('boats.genericEquipment.catalog.noModelMatch')"
    :options="modelOptions"
    v-model="model"
    :errors="errors"
    @select="onModelSelected"
  />
  <!-- Rattachement facultatif au catalogue : `brand` et `model` restent la
       source de vérité, ce champ n'est qu'une clé étrangère de confort. -->
  <input type="hidden" name="equipmentModelId" :value="selectedModelId ?? ''" />
</template>
