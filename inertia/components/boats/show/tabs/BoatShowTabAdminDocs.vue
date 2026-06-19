<script setup lang="ts">
import { DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { Form } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatAdminDocumentFormModal from '~/components/boats/show/modals/BoatAdminDocumentFormModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatDocumentRow, BoatShowDetail } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  boatDocuments: BoatDocumentRow[]
  canManage: boolean
}>()

const { t } = useT()

const isFormModalOpen = ref(false)
const editingDocument = ref<BoatDocumentRow>()

function openCreate() {
  editingDocument.value = undefined
  isFormModalOpen.value = true
}

function openEdit(doc: BoatDocumentRow) {
  editingDocument.value = doc
  isFormModalOpen.value = true
}

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'neutral',
}
</script>

<template>
  <BoatAdminDocumentFormModal
    v-model:open="isFormModalOpen"
    :boat="boat"
    :document="editingDocument"
  />

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">{{ t('boats.adminDocs.title') }}</p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" @click="openCreate">
        + {{ t('boats.adminDocs.addDocument') }}
      </BaseButton>
    </div>

    <div
      v-if="boatDocuments.length === 0"
      class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-10 text-center"
    >
      <DocumentTextIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 text-sm text-fg-muted">{{ t('boats.adminDocs.noDocuments') }}</p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" class="mt-4" @click="openCreate">
        {{ t('boats.adminDocs.addDocument') }}
      </BaseButton>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="doc in boatDocuments"
        :key="doc.id"
        class="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
      >
        <DocumentTextIcon class="h-8 w-8 shrink-0 text-fg-subtle" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate text-sm font-semibold text-fg">
              {{ doc.customTypeLabel || t(`boats.adminDocs.types.${doc.type}`) }}
            </p>
            <BaseBadge :variant="statusVariant[doc.status]">
              {{ t(`boats.adminDocs.status.${doc.status}`) }}
            </BaseBadge>
          </div>
          <p class="text-xs text-fg-muted">
            <span v-if="doc.referenceNumber">{{ doc.referenceNumber }} · </span>
            <span v-if="doc.expiresAt">
              {{ t('boats.adminDocs.form.expiresAt') }} : {{ doc.expiresAt }}
            </span>
            <span v-if="doc.issuer"> · {{ doc.issuer }}</span>
          </p>
        </div>
        <div v-if="canManage" class="flex shrink-0 items-center gap-1">
          <BaseButton variant="ghost" size="sm" @click="openEdit(doc)">
            <PencilIcon class="h-4 w-4" />
            <span class="sr-only">{{ t('boats.adminDocs.editDocument') }}</span>
          </BaseButton>
          <Form
            :action="{ url: `/boats/${boat.id}/admin-documents/${doc.id}`, method: 'delete' }"
            #default="{ processing }"
          >
            <button
              type="submit"
              :disabled="processing"
              class="rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
              :title="t('boats.adminDocs.deleteDocument')"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </Form>
        </div>
      </li>
    </ul>
  </div>
</template>
