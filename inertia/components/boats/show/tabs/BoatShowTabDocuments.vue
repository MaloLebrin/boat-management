<script setup lang="ts">
import { DocumentTextIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatDocumentAddModal from '~/components/boats/show/modals/BoatDocumentAddModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, MediaRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  canManage: boolean
}>()

const { t } = useT()
const isAddModalOpen = ref(false)

const documents = computed<MediaRow[]>(() =>
  props.boat.media.filter((m) => m.kind === 'document').sort((a, b) => a.position - b.position)
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<template>
  <BoatDocumentAddModal v-model:open="isAddModalOpen" :boat="boat" />

  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">{{ t('boats.show.mediaUpload.documents') }}</p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" @click="isAddModalOpen = true">
        + {{ t('boats.show.mediaUpload.addDocument') }}
      </BaseButton>
    </div>

    <!-- Empty state -->
    <div
      v-if="documents.length === 0"
      class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-10 text-center"
    >
      <DocumentTextIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 text-sm text-fg-muted">{{ t('boats.show.mediaUpload.noDocuments') }}</p>
      <p class="mt-1 text-xs text-fg-subtle">{{ t('boats.show.mediaUpload.documentFormats') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        class="mt-4"
        @click="isAddModalOpen = true"
      >
        {{ t('boats.show.mediaUpload.addDocument') }}
      </BaseButton>
    </div>

    <!-- Document list -->
    <ul v-else class="space-y-2">
      <li
        v-for="doc in documents"
        :key="doc.id"
        class="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
      >
        <DocumentTextIcon class="h-8 w-8 shrink-0 text-fg-subtle" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-fg">
            {{ doc.caption || doc.originalFilename }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ doc.format.toUpperCase() }} · {{ formatBytes(doc.bytes) }}
          </p>
        </div>
        <a
          :href="`/boats/${boat.id}/media/${doc.id}/download`"
          class="shrink-0 text-sm font-medium text-brand hover:underline"
        >
          ↓
        </a>
        <Form
          v-if="canManage"
          :action="{ url: `/boats/${boat.id}/media/${doc.id}`, method: 'delete' }"
          #default="{ processing }"
        >
          <button
            type="submit"
            :disabled="processing"
            class="shrink-0 rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
            :title="t('boats.show.mediaUpload.deleteDocument')"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </Form>
      </li>
    </ul>
  </div>
</template>
