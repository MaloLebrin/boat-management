<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { OwnerDocumentRow } from '#shared/types/owner_portal'

/** Documents administratifs du bateau et leurs échéances (#890), sans fichier ni coût. */
defineProps<{ documents: OwnerDocumentRow[] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <BaseEmptyState
    v-if="documents.length === 0"
    :title="t('owner.boats.show.documents.emptyTitle')"
  />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="doc in documents" :key="doc.id" data-testid="owner-document-row">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-fg">
            {{ doc.customTypeLabel || t(`boats.adminDocs.types.${doc.type}`) }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ [doc.issuer, doc.referenceNumber].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <span class="shrink-0 text-xs text-fg-muted">
          {{
            doc.expiresAt
              ? t('owner.boats.show.documents.expiresOn', { date: formatDate(doc.expiresAt) })
              : t('owner.boats.show.documents.noExpiry')
          }}
        </span>
      </div>
    </BaseCard>
  </div>
</template>
