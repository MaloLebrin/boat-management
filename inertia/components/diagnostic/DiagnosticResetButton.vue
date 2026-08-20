<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import type { DiagnosticResetScope } from '#shared/types/diagnostic'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  boatId: number
  engineId: number
  scope: DiagnosticResetScope
}>()

const confirmOpen = ref(false)

function reset() {
  confirmOpen.value = false
  router.delete(`/boats/${props.boatId}/engines/${props.engineId}/diagnostic/checks`, {
    data: { scope: props.scope },
    preserveScroll: true,
  })
}
</script>

<template>
  <BaseButton variant="outline" size="sm" @click="confirmOpen = true">
    {{ t('diagnostic.common.reset') }}
  </BaseButton>
  <BaseConfirmModal
    :open="confirmOpen"
    :title="t('diagnostic.common.reset')"
    :message="
      scope === 'all'
        ? t('diagnostic.common.resetConfirm')
        : t('diagnostic.common.resetSheetConfirm')
    "
    :confirm-label="t('diagnostic.common.reset')"
    @update:open="confirmOpen = $event"
    @confirm="reset"
  />
</template>
