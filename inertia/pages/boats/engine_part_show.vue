<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import EnginePartModal from '~/components/engine/show/EnginePartModal.vue'
import EnginePartShowTabDocuments from '~/components/engine/parts/show/tabs/EnginePartShowTabDocuments.vue'
import EnginePartShowTabInfo from '~/components/engine/parts/show/tabs/EnginePartShowTabInfo.vue'
import { useT } from '~/composables/useT'
import type { BoatShowEnginePart } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number; kind: string; brand: string | null; model: string | null }
  part: BoatShowEnginePart
  canManage: boolean
}>()

type TabKey = 'info' | 'documents'
const tab = ref<TabKey>('info')
const isEditOpen = ref(false)

onMounted(() => {
  const fromUrl = new URLSearchParams(window.location.search).get('tab') as TabKey | null
  if (fromUrl && (fromUrl === 'info' || fromUrl === 'documents')) tab.value = fromUrl
})

watch(tab, (newTab) => {
  const url = new URL(window.location.href)
  if (newTab === 'info') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', newTab)
  }
  window.history.replaceState(window.history.state, '', url.pathname + url.search)
})

function engineTitle(): string {
  if (props.engine.brand && props.engine.model) return `${props.engine.brand} ${props.engine.model}`
  if (props.engine.brand) return props.engine.brand
  if (props.engine.model) return props.engine.model
  return props.engine.kind
}

function wearStateVariant(state: string): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  if (state === 'new') return 'success'
  if (state === 'good') return 'info'
  if (state === 'worn') return 'warning'
  if (state === 'to_replace') return 'danger'
  return 'neutral'
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="[
      { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
      { label: boat.name, href: `/boats/${boat.id}` },
      { label: t('boats.engineShow.breadcrumb.equipment'), href: `/boats/${boat.id}?tab=equipment` },
      { label: engineTitle(), href: `/boats/${boat.id}/engines/${engine.id}?tab=parts` },
      { label: part.designation },
    ]" />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ part.designation }}</BaseHeading>
            <BaseBadge v-if="part.wearState" :variant="wearStateVariant(part.wearState)">
              {{ t(`equipment.wearState.${part.wearState}`) }}
            </BaseBadge>
          </div>
          <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
            <p v-if="part.reference">{{ part.reference }}</p>
            <p v-if="part.supplier">{{ part.supplier }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton
            variant="secondary"
            size="sm"
            :href="`/boats/${boat.id}/engines/${engine.id}?tab=parts`"
          >
            ← {{ t('boats.engineShow.parts.title') }}
          </BaseButton>
          <BaseButton v-if="canManage" size="sm" @click="isEditOpen = true">
            {{ t('boats.engineShow.parts.edit') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs v-model="tab" :tabs="[
        { key: 'info', label: t('boats.engineShow.partShow.tabs.info') },
        { key: 'documents', label: t('boats.engineShow.partShow.tabs.documents'), badge: String(part.documents.length || '') },
      ]" />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <EnginePartShowTabInfo v-if="tab === 'info'" :part="part" />
        <EnginePartShowTabDocuments
          v-else-if="tab === 'documents'"
          :boat="boat"
          :engine="engine"
          :part="part"
          :can-manage="canManage"
        />
      </div>
    </Transition>

    <EnginePartModal
      v-if="canManage"
      v-model:open="isEditOpen"
      :boat-id="boat.id"
      :engine-id="engine.id"
      :editing-part="part"
    />
  </div>
</template>
