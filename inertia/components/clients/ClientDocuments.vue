<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DocumentAddModal from '~/components/media/DocumentAddModal.vue'
import DocumentList from '~/components/media/DocumentList.vue'
import { useT } from '~/composables/use_t'
import type { MediaRow } from '~/types/boat_show'

defineProps<{
  clientId: number
  clientName: string
  documents: MediaRow[]
  canManage: boolean
}>()

const { t } = useT()
const isAddModalOpen = ref(false)

const listLabels = computed(() => ({
  title: t('clients.documents.title'),
  add: t('clients.documents.add'),
  empty: t('clients.documents.empty'),
  formats: t('clients.documents.formats'),
  delete: t('clients.documents.delete'),
  download: t('clients.documents.download'),
}))

const deleteConfirm = computed(() => ({
  title: t('clients.documents.deleteConfirm.title'),
  message: t('clients.documents.deleteConfirm.message'),
  confirmLabel: t('clients.delete'),
}))

const modalLabels = computed(() => ({
  dropzone: t('clients.documents.dropzone'),
  formats: t('clients.documents.formats'),
  browse: t('clients.documents.browse'),
  selectedFiles: t('clients.documents.selectedFiles'),
  caption: t('clients.documents.caption'),
  upload: t('clients.documents.upload'),
  uploading: t('clients.documents.uploading'),
}))
</script>

<template>
  <BaseCard class="mt-4">
    <DocumentAddModal
      v-model:open="isAddModalOpen"
      :upload-url="`/clients/${clientId}/documents`"
      :title="t('clients.documents.modalTitle')"
      :subtitle="t('clients.documents.modalSubtitle', { name: clientName })"
      :labels="modalLabels"
      :close-label="t('common.cancel')"
      preserve-scroll
    />

    <DocumentList
      dense
      :documents="documents"
      :can-manage="canManage"
      :labels="listLabels"
      :delete-confirm="deleteConfirm"
      :download-url-for="(doc) => `/clients/${clientId}/media/${doc.id}/download`"
      :delete-url-for="(doc) => `/clients/${clientId}/media/${doc.id}`"
      @add="isAddModalOpen = true"
    />
  </BaseCard>
</template>
