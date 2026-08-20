<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import ClientForm from '~/components/clients/ClientForm.vue'
import ClientListToolbar from '~/components/clients/ClientListToolbar.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type { ClientListFilters, ClientRow, ClientsPaginated } from '../../../shared/types/client'

const props = defineProps<{
  clients: ClientsPaginated
  filters: ClientListFilters
  canDelete: boolean
  readOnly?: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const showCreateForm = ref(false)
const editingClientId = ref<number | null>(null)
const deletingClient = ref<ClientRow | null>(null)

function handlePageChange(newPage: number) {
  router.get(
    '/clients',
    {
      q: props.filters.q || undefined,
      status: props.filters.status || undefined,
      sort: props.filters.sort,
      direction: props.filters.direction,
      page: newPage,
      perPage: props.filters.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function confirmDelete(client: ClientRow) {
  deletingClient.value = client
}

function executeDelete() {
  if (!deletingClient.value) return
  router.delete(`/clients/${deletingClient.value.id}`, {
    preserveScroll: true,
    onFinish: () => {
      deletingClient.value = null
    },
  })
}

function getPermitLabel(client: ClientRow): string {
  if (!client.navigationPermitType) return '-'
  const type = t(`clients.permitTypes.${client.navigationPermitType}`)
  return client.navigationPermitNumber ? `${type} (${client.navigationPermitNumber})` : type
}
</script>

<template>
  <Head :title="t('clients.title')" />

  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <BaseHeading level="1">{{ t('clients.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('clients.count', { count: String(clients.meta.total) }) }}
        </p>
      </div>
      <BaseButton
        v-if="!readOnly"
        variant="primary"
        size="sm"
        type="button"
        @click="showCreateForm = true"
      >
        {{ t('clients.add') }}
      </BaseButton>
    </div>

    <BaseAlert v-if="readOnly" variant="warning" class="mb-6">
      {{ t('clients.readOnlyNotice') }}
    </BaseAlert>

    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <ClientForm v-if="showCreateForm" class="mb-6" @close="showCreateForm = false" />

    <ClientListToolbar :filters="filters" />

    <div v-if="clients.data.length > 0" class="mt-6 space-y-3">
      <BaseCard v-for="client in clients.data" :key="client.id">
        <template v-if="editingClientId === client.id">
          <ClientForm :client="client" @close="editingClientId = null" />
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-fg">{{ client.fullName }}</p>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                <span v-if="client.email">{{ client.email }}</span>
                <span v-if="client.phone">{{ client.phone }}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <ClientStatusBadge :status="client.status" />
                <span class="text-xs text-fg-muted">{{ getPermitLabel(client) }}</span>
              </div>
              <p v-if="client.notes" class="mt-2 whitespace-pre-wrap text-sm text-fg-muted">
                {{ client.notes }}
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <Link :href="`/clients/${client.id}`">
                <BaseButton type="button" variant="secondary" size="sm">
                  {{ t('clients.view') }}
                </BaseButton>
              </Link>
              <BaseButton
                v-if="!readOnly"
                type="button"
                variant="secondary"
                size="sm"
                @click="editingClientId = client.id"
              >
                {{ t('clients.edit') }}
              </BaseButton>
              <BaseButton
                v-if="canDelete"
                type="button"
                variant="ghost"
                size="sm"
                @click="confirmDelete(client)"
              >
                {{ t('clients.delete') }}
              </BaseButton>
            </div>
          </div>
        </template>
      </BaseCard>
    </div>

    <div v-else-if="!showCreateForm" class="mt-8">
      <BaseEmptyState
        :title="t('clients.empty.title')"
        :description="t('clients.empty.description')"
        :action-label="t('clients.add')"
        @action="showCreateForm = true"
      />
    </div>

    <div v-if="clients.data.length > 0 && clients.meta.lastPage > 1" class="mt-6">
      <BasePagination
        :page="clients.meta.currentPage"
        :page-count="clients.meta.lastPage"
        @update:page="handlePageChange"
      />
    </div>

    <BaseConfirmModal
      :open="deletingClient !== null"
      :title="t('clients.deleteConfirm.title')"
      :message="t('clients.deleteConfirm.message')"
      :confirm-label="t('clients.delete')"
      :cancel-label="t('clients.form.cancel')"
      @update:open="deletingClient = null"
      @confirm="executeDelete"
    />
  </div>
</template>
