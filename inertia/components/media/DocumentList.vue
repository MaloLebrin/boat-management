<script setup lang="ts">
import { DocumentTextIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { Form } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import type { MediaRow } from '~/types/boat_show'
import type { DocumentDeleteConfirm, DocumentListLabels } from '~/types/documents'
import { useByteFormat } from '~/composables/use_byte_format'
import { useRowDeleteConfirmation } from '~/composables/use_row_delete_confirmation'

/**
 * Liste de documents d'une ressource (bateau, moteur, pièce, client) —
 * générique (vague 3.1). Le domaine fournit les documents, les URL de
 * téléchargement et de suppression et ses libellés ; il décide aussi si la
 * suppression demande confirmation (`deleteConfirm`) ou part directement
 * (formulaire Inertia).
 */
const props = withDefaults(
  defineProps<{
    documents: MediaRow[]
    canManage: boolean
    labels: DocumentListLabels
    downloadUrlFor: (doc: MediaRow) => string
    deleteUrlFor: (doc: MediaRow) => string
    deleteConfirm?: DocumentDeleteConfirm | null
    /** Espace vertical entre l'en-tête et le contenu (`space-y-6` par défaut). */
    dense?: boolean
  }>(),
  { deleteConfirm: null, dense: false }
)

const emit = defineEmits<{
  (e: 'add'): void
}>()

const { formatFileSize } = useByteFormat()

const documentDeletion = useRowDeleteConfirmation<MediaRow>({
  url: (doc) => props.deleteUrlFor(doc),
  visit: { preserveScroll: true },
})

const sorted = computed<MediaRow[]>(() =>
  [...props.documents].sort((a, b) => a.position - b.position)
)
</script>

<template>
  <BaseConfirmModal
    v-if="deleteConfirm"
    :open="documentDeletion.isOpen.value"
    :title="deleteConfirm.title"
    :message="deleteConfirm.message"
    :confirm-label="deleteConfirm.confirmLabel"
    @update:open="documentDeletion.release()"
    @confirm="documentDeletion.confirm()"
  />

  <div :class="dense ? 'space-y-4' : 'space-y-6'">
    <div class="flex items-center justify-between">
      <p :class="dense ? 'text-sm font-semibold text-fg' : 'text-sm text-fg-muted'">
        {{ labels.title }}
      </p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" @click="emit('add')">
        {{ labels.add }}
      </BaseButton>
    </div>

    <div
      v-if="sorted.length === 0"
      :class="[
        'rounded-lg border-2 border-dashed border-border bg-surface-muted/30 text-center',
        dense ? 'p-8' : 'p-10',
      ]"
    >
      <DocumentTextIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 text-sm text-fg-muted">{{ labels.empty }}</p>
      <p class="mt-1 text-xs text-fg-subtle">{{ labels.formats }}</p>
      <BaseButton
        v-if="canManage && !dense"
        variant="secondary"
        size="sm"
        class="mt-4"
        @click="emit('add')"
      >
        {{ labels.add }}
      </BaseButton>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="doc in sorted"
        :key="doc.id"
        class="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
      >
        <DocumentTextIcon class="h-8 w-8 shrink-0 text-fg-subtle" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-fg">
            {{ doc.caption || doc.originalFilename }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ doc.format.toUpperCase() }} · {{ formatFileSize(doc.bytes) }}
          </p>
        </div>
        <!-- eslint-disable vue/no-restricted-v-bind -- téléchargement de document : pas une navigation -->
        <a
          :href="downloadUrlFor(doc)"
          class="shrink-0 text-sm font-medium text-brand hover:underline"
          :title="labels.download"
        >
          ↓
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
        <template v-if="canManage">
          <button
            v-if="deleteConfirm"
            type="button"
            class="shrink-0 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
            :title="labels.delete"
            @click="documentDeletion.ask(doc)"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
          <Form
            v-else
            :action="{ url: deleteUrlFor(doc), method: 'delete' }"
            #default="{ processing }"
          >
            <button
              type="submit"
              :disabled="processing"
              class="shrink-0 rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
              :title="labels.delete"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </Form>
        </template>
      </li>
    </ul>
  </div>
</template>
