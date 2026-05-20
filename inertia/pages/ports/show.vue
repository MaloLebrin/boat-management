<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import { ArrowLeftIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import MarinaMapTab from '~/components/ports/show/tabs/MarinaMapTab.vue'
import PortListTab from '~/components/ports/show/tabs/PortListTab.vue'
import { useT } from '~/composables/useT'
import type { PortShowDetail } from '~/types/port'

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const activeTab = ref<'list' | 'plan'>('list')

const tabs = [
  { key: 'list', label: t('ports.tabs.list') },
  { key: 'plan', label: t('ports.tabs.plan') },
]

function handleDeletePort() {
  const hasBoats =
    props.port.pontoons.some((p) => p.boats.length > 0) ||
    props.port.mouillages.some((m) => m.boats.length > 0)
  if (hasBoats) {
    alert(t('ports.hasBoats'))
    return
  }
  if (confirm(t('ports.deleteConfirm'))) {
    router.delete(`/ports/${props.port.id}`)
  }
}
</script>

<template>
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <!-- Breadcrumb -->
    <div class="mb-6">
      <Link href="/ports" class="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeftIcon class="h-4 w-4" />
        {{ t('ports.backToList') }}
      </Link>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <MapPinIcon class="h-6 w-6 text-brand" />
        </div>
        <div>
          <BaseHeading level="1">{{ port.name }}</BaseHeading>
          <p v-if="port.city" class="mt-1 text-fg-muted">
            {{ port.city }}<span v-if="port.country">, {{ port.country }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Link :href="`/ports/${port.id}/edit`">
          <BaseButton variant="secondary" size="sm">
            <PencilIcon class="h-4 w-4" />
            {{ t('common.edit') }}
          </BaseButton>
        </Link>
        <BaseButton variant="danger" size="sm" @click="handleDeletePort">
          <TrashIcon class="h-4 w-4" />
          {{ t('common.delete') }}
        </BaseButton>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mt-8">
      <BaseTabs v-model="activeTab" :tabs="tabs" />
    </div>

    <!-- Tab content -->
    <div class="mt-6">
      <PortListTab v-if="activeTab === 'list'" :port="port" />
      <MarinaMapTab v-if="activeTab === 'plan'" :port="port" />
    </div>
  </div>
</template>
