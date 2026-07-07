<script setup lang="ts">
import { DocumentTextIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import ClientDocumentAddModal from '~/components/clients/ClientDocumentAddModal.vue'
import { useT } from '~/composables/use_t'
import type { MediaRow } from '~/types/boat_show'

const props = defineProps<{
  clientId: number
  clientName: string
  documents: MediaRow[]
  canManage: boolean
}>()

const { t } = useT()
const isAddModalOpen = ref(false)
const docToDelete = ref<MediaRow | null>(null)

const documents = computed<MediaRow[]>(() =>
  [...props.documents].sort((a, b) => a.position - b.position)
)

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function confirmDelete() {
  if (!docToDelete.value) return
  router.delete(`/clients/${props.clientId}/media/${docToDelete.value.id}`, {
    preserveScroll: true,
  })
  docToDelete.value = null
}
</script>

<template>
  <BaseCard class="mt-4">
    <ClientDocumentAddModal
      v-model:open="isAddModalOpen"
      :client-id="clientId"
      :client-name="clientName"
    />
    <BaseConfirmModal
      :open="docToDelete !== null"
      :title="t('clients.documents.deleteConfirm.title')"
      :message="t('clients.documents.deleteConfirm.message')"
      :confirm-label="t('clients.delete')"
      @update:open="docToDelete = null"
      @confirm="confirmDelete"
    />

    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm font-semibold text-fg">{{ t('clients.documents.title') }}</p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" @click="isAddModalOpen = true">
        {{ t('clients.documents.add') }}
      </BaseButton>
    </div>

    <!-- Empty state -->
    <div
      v-if="documents.length === 0"
      class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <DocumentTextIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 text-sm text-fg-muted">{{ t('clients.documents.empty') }}</p>
      <p class="mt-1 text-xs text-fg-subtle">{{ t('clients.documents.formats') }}</p>
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
          :href="`/clients/${clientId}/media/${doc.id}/download`"
          class="shrink-0 text-sm font-medium text-brand hover:underline"
          :title="t('clients.documents.download')"
        >
          ↓
        </a>
        <button
          v-if="canManage"
          type="button"
          class="shrink-0 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
          :title="t('clients.documents.delete')"
          @click="docToDelete = doc"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </li>
    </ul>
  </BaseCard>
</template>
