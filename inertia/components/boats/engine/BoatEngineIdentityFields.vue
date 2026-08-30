<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import { useT } from '~/composables/use_t'
import type { EngineBrandOption, EngineModelOption } from '#shared/types/engine_catalog'
import type { FormErrors } from '~/utils/form_errors'

/**
 * Identité du moteur (#573) : marque et modèle, assistés par le catalogue.
 *
 * **Toute saisie hors catalogue reste acceptée** et part telle quelle au
 * serveur : les deux champs restent de simples champs de formulaire natifs,
 * sérialisés par le `<Form>` Inertia de la page, et `brand`/`model` demeurent la
 * source de vérité. `engineModelId` n'est qu'un rattachement facultatif.
 *
 * Les modèles de la marque retenue sont chargés par une visite Inertia
 * partielle (`router.reload({ only: ['engineCatalogModels'] })`) — pas de
 * `fetch`, pas de route `/api`, pas de CSRF manuel.
 */
const brand = defineModel<string>('brand', { required: true })
const model = defineModel<string>('model', { required: true })

const props = defineProps<{
  errors: FormErrors
  brands?: EngineBrandOption[]
  catalogModels?: EngineModelOption[]
  /**
   * Marque rapprochée côté serveur du `brand` déjà saisi
   * (`EngineCatalogService.resolveBrand`) : à l'édition, la liste des modèles
   * est ainsi utile dès l'ouverture, sans aller-retour supplémentaire.
   */
  catalogBrandId?: number | null
  /** Modèle déjà rattaché, à réémettre tant que la saisie ne change pas. */
  engineModelId?: number | null
  /**
   * Surface d'origine, quand le formulaire est monté dans une modale : elle
   * voyage dans l'URL du rechargement partiel pour que la modale se rouvre
   * après le remontage (cf. `shouldReopenEngineForm`).
   */
  surface?: string | null
}>()

const emit = defineEmits<{
  /** Émis quand l'utilisateur retient un modèle du catalogue. */
  (e: 'select-model', option: EngineModelOption): void
}>()

const { t } = useT()

/** Marque du catalogue retenue, si la saisie en désigne une. */
const selectedBrandId = ref<number | null>(props.catalogBrandId ?? null)
/** Rattachement effectif envoyé au serveur — vidé dès que la saisie diverge. */
const selectedModelId = ref<number | null>(props.engineModelId ?? null)

const brandOptions = computed<ComboboxOption[]>(() =>
  (props.brands ?? []).map((b) => ({
    value: String(b.id),
    label: b.name,
    hint: b.families.map((f) => t(`boats.options.engineCatalogFamily.${f}`)).join(' · '),
  }))
)

/** Puissance et code plaque en ligne secondaire : c'est ce qui distingue deux
 * gammes voisines dans une liste de plusieurs dizaines de modèles. */
function modelHint(m: EngineModelOption): string | undefined {
  const parts = [
    m.powerHp ? t('boats.engines.catalog.powerHint', { power: String(m.powerHp) }) : null,
    m.modelCode && m.modelCode !== m.name ? m.modelCode : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

const modelOptions = computed<ComboboxOption[]>(() =>
  selectedBrandId.value === null
    ? []
    : (props.catalogModels ?? []).map((m) => ({
        value: String(m.id),
        label: m.name,
        hint: modelHint(m),
      }))
)

function onBrandSelected(option: ComboboxOption) {
  const brandId = Number(option.value)
  selectedBrandId.value = brandId
  model.value = ''
  selectedModelId.value = null
  // Visite Inertia partielle, pas un `fetch`. `engineCatalogBrandId` fait
  // partie du rechargement : la visite remonte l'arbre, et c'est le serveur qui
  // réapprend au formulaire quelle marque est retenue.
  router.reload({
    only: ['engineCatalogModels', 'engineCatalogBrandId'],
    data: props.surface
      ? { engineBrandId: brandId, engineForm: props.surface }
      : { engineBrandId: brandId },
    preserveScroll: true,
  })
}

function onModelSelected(option: ComboboxOption) {
  const modelId = Number(option.value)
  const catalogModel = (props.catalogModels ?? []).find((m) => m.id === modelId)
  if (!catalogModel) return
  selectedModelId.value = modelId
  emit('select-model', catalogModel)
}

// Une marque retapée à la main (ou effacée) invalide la liste de modèles
// chargée et le rattachement : on ne veut pas proposer les modèles d'un autre
// motoriste, ni conserver une clé étrangère qui ne correspond plus.
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

// Le serveur rapproche la marque au rendu : un moteur déjà en base doit
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
    :label="t('boats.engines.fields.brand')"
    :placeholder="t('boats.engines.catalog.brandPlaceholder')"
    :hint="t('boats.engines.catalog.freeTextHint')"
    :empty-label="t('boats.engines.catalog.noBrandMatch')"
    :options="brandOptions"
    v-model="brand"
    :errors="errors"
    @select="onBrandSelected"
  />
  <BaseCombobox
    id="model"
    name="model"
    :label="t('boats.engines.fields.model')"
    :placeholder="t('boats.engines.catalog.modelPlaceholder')"
    :hint="
      selectedBrandId === null
        ? t('boats.engines.catalog.modelNeedsBrandHint')
        : t('boats.engines.catalog.freeTextHint')
    "
    :empty-label="t('boats.engines.catalog.noModelMatch')"
    :options="modelOptions"
    v-model="model"
    :errors="errors"
    @select="onModelSelected"
  />
  <!-- Rattachement facultatif au catalogue : `brand` et `model` restent la
       source de vérité, ce champ n'est qu'une clé étrangère de confort. -->
  <input type="hidden" name="engineModelId" :value="selectedModelId ?? ''" />
</template>
