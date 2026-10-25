<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useClipboard } from '~/composables/use_clipboard'
import { useT } from '~/composables/use_t'

/**
 * Champ en lecture seule + bouton « Copier » (#1018). `secret` masque la
 * valeur (type password, sans remplissage automatique) tant qu'elle n'est pas
 * copiée : utile pour un jeton affiché une seule fois.
 */
const props = defineProps<{
  modelValue: string
  label?: string
  name?: string
  id?: string
  hint?: string
  /** Nom accessible du champ quand aucun `label` visible n'est fourni. */
  ariaLabel?: string
  secret?: boolean
}>()

const { t } = useT()
const { copied, supported, copy } = useClipboard()
</script>

<template>
  <BaseInput
    :id="id"
    :model-value="modelValue"
    :label="label"
    :name="name"
    :aria-label="label ? undefined : ariaLabel"
    :hint="supported ? hint : (hint ?? t('common.clipboard.unavailable'))"
    :type="secret ? 'password' : 'text'"
    :autocomplete="secret ? 'off' : undefined"
    data-testid="base-copy-field"
    readonly
  >
    <template #trailing>
      <BaseButton
        size="sm"
        variant="secondary"
        type="button"
        :disabled="!supported"
        data-testid="base-copy-field-button"
        @click="copy(props.modelValue)"
      >
        <span aria-live="polite">
          {{ copied ? t('common.clipboard.copied') : t('common.clipboard.copy') }}
        </span>
      </BaseButton>
    </template>
  </BaseInput>
</template>
