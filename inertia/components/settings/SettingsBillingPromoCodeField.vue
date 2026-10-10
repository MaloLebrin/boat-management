<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { FormErrors } from '~/utils/form_errors'

/**
 * Champ « Code promo » du checkout (#955), partagé par l'onglet Facturation et
 * la modale d'upgrade. Le code est vérifié côté serveur : l'erreur revient
 * dans `errors.promoCode`, que `BaseInput` affiche sous le champ.
 */
withDefaults(
  defineProps<{
    modelValue: string
    errors?: FormErrors
    disabled?: boolean
  }>(),
  { errors: undefined, disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useT()
</script>

<template>
  <BaseInput
    id="promoCode"
    name="promoCode"
    type="text"
    autocomplete="off"
    autocapitalize="characters"
    spellcheck="false"
    :label="t('settings.billing.promoCode.label')"
    :placeholder="t('settings.billing.promoCode.placeholder')"
    :hint="t('settings.billing.promoCode.hint')"
    :model-value="modelValue"
    :errors="errors"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event.trim())"
  />
</template>
