<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import { EXPORT_ASYNC_THRESHOLD } from '../../../shared/constants/exports'

const props = withDefaults(
  defineProps<{
    /** Texte du bouton d'ouverture. */
    label: string
    /** Titre de la modale. */
    title: string
    /** URL de base de l'export (sans query params). */
    baseUrl: string
    /** Paramètres supplémentaires à inclure dans l'URL (hors période). */
    params?: Record<string, string | number | null | undefined>
    /** Affiche les champs de période (du/au). Par défaut true. */
    showPeriod?: boolean
    /** Variante du bouton d'ouverture. */
    buttonVariant?: 'primary' | 'secondary' | 'ghost'
    /** Taille du bouton d'ouverture. */
    buttonSize?: 'sm' | 'md' | 'lg'
  }>(),
  {
    params: () => ({}),
    showPeriod: true,
    buttonVariant: 'secondary',
    buttonSize: 'sm',
  }
)

const { t } = useT()

const open = ref(false)
const from = ref('')
const to = ref('')

// Réinitialise les champs à l'ouverture
watch(open, (isOpen) => {
  if (isOpen) {
    from.value = ''
    to.value = ''
  }
})

const exportHref = computed(() => {
  const searchParams = new URLSearchParams()

  // Ajoute la période si les champs sont remplis
  if (props.showPeriod) {
    if (from.value) searchParams.set('from', from.value)
    if (to.value) searchParams.set('to', to.value)
  }

  // Ajoute les paramètres supplémentaires (hors null/undefined/vide)
  for (const [key, value] of Object.entries(props.params)) {
    if (value != null && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  const qs = searchParams.toString()
  return `${props.baseUrl}${qs ? `?${qs}` : ''}`
})
</script>

<template>
  <BaseButton :variant="buttonVariant" :size="buttonSize" type="button" @click="open = true">
    {{ label }}
  </BaseButton>

  <BaseModal :open="open" :title="title" @update:open="open = $event">
    <div class="space-y-4">
      <div v-if="showPeriod" class="grid gap-4 sm:grid-cols-2">
        <BaseInput id="export-from" v-model="from" type="date" :label="t('common.exports.from')" />
        <BaseInput id="export-to" v-model="to" type="date" :label="t('common.exports.to')" />
      </div>

      <slot />

      <p class="text-sm text-fg-muted">
        {{ t('common.exports.asyncHint', { threshold: String(EXPORT_ASYNC_THRESHOLD) }) }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" size="sm" type="button" @click="open = false">
          {{ t('common.cancel') }}
        </BaseButton>
        <!-- Téléchargement : une visite Inertia rendrait le fichier comme une page. -->
        <BaseButton
          variant="primary"
          size="sm"
          :href="exportHref"
          external-href
          data-testid="export-download"
          @click="open = false"
        >
          {{ t('common.exports.download') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
