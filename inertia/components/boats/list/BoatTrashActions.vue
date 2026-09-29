<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  name: string
}>()

const { t } = useT()
const confirming = ref(false)
const purging = ref(false)

function forceDelete() {
  purging.value = true
  confirming.value = false
  router.delete(`/boats/${props.boatId}/force`, {
    preserveScroll: true,
    onFinish: () => {
      purging.value = false
    },
  })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <BaseButton
      :href="`/boats/${boatId}/restore`"
      method="post"
      variant="secondary"
      size="sm"
      preserve-scroll
    >
      {{ t('boats.trash.restore') }}
    </BaseButton>
    <BaseButton
      type="button"
      variant="danger"
      size="sm"
      :disabled="purging"
      @click="confirming = true"
    >
      {{ t('boats.trash.forceDelete') }}
    </BaseButton>
    <BaseConfirmModal
      :open="confirming"
      :title="t('boats.trash.forceConfirm.title')"
      :message="t('boats.trash.forceConfirm.message', { name })"
      :confirm-label="t('boats.trash.forceDelete')"
      :cancel-label="t('common.cancel')"
      @update:open="confirming = $event"
      @confirm="forceDelete"
    />
  </div>
</template>
