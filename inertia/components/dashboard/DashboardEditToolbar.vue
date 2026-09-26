<script setup lang="ts">
import { CheckIcon, PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'

/** Actions du mode édition : elles remplacent « Personnaliser » et « + Créer » dans l'en-tête. */
defineProps<{
  canAdd: boolean
  isDirty: boolean
  isSaving: boolean
  isCustomized: boolean
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'reset'): void
  (e: 'cancel'): void
  (e: 'done'): void
}>()

const { t } = useT()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" data-testid="dashboard-edit-toolbar">
    <BaseButton
      variant="outline"
      size="sm"
      :disabled="!canAdd || isSaving"
      data-testid="dashboard-edit-add"
      @click="emit('add')"
    >
      <PlusIcon class="h-4 w-4" aria-hidden="true" />
      {{ t('dashboard.customize.addWidget') }}
    </BaseButton>
    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="!isCustomized || isSaving"
      data-testid="dashboard-edit-reset"
      @click="emit('reset')"
    >
      {{ t('dashboard.customize.reset') }}
    </BaseButton>
    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="isSaving"
      data-testid="dashboard-edit-cancel"
      @click="emit('cancel')"
    >
      {{ t('common.cancel') }}
    </BaseButton>
    <BaseButton
      variant="primary"
      size="sm"
      :disabled="isSaving"
      data-testid="dashboard-edit-done"
      @click="emit('done')"
    >
      <CheckIcon class="h-4 w-4" aria-hidden="true" />
      {{ isSaving ? t('dashboard.customize.saving') : t('dashboard.customize.done') }}
    </BaseButton>
  </div>
</template>
