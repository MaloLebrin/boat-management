<script setup lang="ts">
import { computed, ref } from 'vue'
import DocumentAddModal from '~/components/media/DocumentAddModal.vue'
import DocumentList from '~/components/media/DocumentList.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEnginePart, MediaRow } from '~/types/boat_show'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number }
  part: BoatShowEnginePart
  canManage: boolean
}>()

const { t } = useT()
const isAddModalOpen = ref(false)

const documents = computed<MediaRow[]>(() =>
  props.part.documents.filter((m) => m.kind === 'document')
)

const listLabels = computed(() => ({
  title: t('boats.show.mediaUpload.documents'),
  add: `+ ${t('boats.show.mediaUpload.addDocument')}`,
  empty: t('boats.show.mediaUpload.noDocuments'),
  formats: t('boats.show.mediaUpload.documentFormats'),
  delete: t('boats.show.mediaUpload.deleteDocument'),
}))

const modalLabels = computed(() => ({
  dropzone: t('boats.show.mediaUpload.dropzone'),
  formats: t('boats.show.mediaUpload.documentFormats'),
  browse: t('boats.show.mediaUpload.browse'),
  selectedFiles: t('boats.show.mediaUpload.selectedFiles'),
  caption: t('boats.show.mediaUpload.caption'),
  upload: t('boats.show.mediaUpload.upload'),
  uploading: t('boats.show.mediaUpload.uploading'),
}))

const base = computed(
  () => `/boats/${props.boat.id}/engines/${props.engine.id}/parts/${props.part.id}`
)
</script>

<template>
  <DocumentAddModal
    v-model:open="isAddModalOpen"
    :upload-url="`${base}/documents`"
    :title="t('boats.show.mediaUpload.modalTitle')"
    :subtitle="part.designation"
    :labels="modalLabels"
  />

  <DocumentList
    :documents="documents"
    :can-manage="canManage"
    :labels="listLabels"
    :download-url-for="(doc) => `${base}/media/${doc.id}/download`"
    :delete-url-for="(doc) => `${base}/media/${doc.id}`"
    @add="isAddModalOpen = true"
  />
</template>
