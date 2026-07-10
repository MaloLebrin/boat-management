<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import SafetyShowTabInfo from '~/components/boats/safety/show/tabs/SafetyShowTabInfo.vue'
import SafetyShowTabPhotos from '~/components/boats/safety/show/tabs/SafetyShowTabPhotos.vue'
import { useT } from '~/composables/use_t'
import type { BoatSafetyEquipmentDetail } from '~/types/boat_show'

const { t } = useT()

defineProps<{
  boat: { id: number; name: string }
  item: BoatSafetyEquipmentDetail
  canManage: boolean
}>()

type TabKey = 'info' | 'photos'
const tab = ref<TabKey>('info')

onMounted(() => {
  const fromUrl = new URLSearchParams(window.location.search).get('tab') as TabKey | null
  if (fromUrl === 'photos') tab.value = fromUrl
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

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'to_check') return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        { label: t('boats.safetyEquipment.title'), href: `/boats/${boat.id}?tab=safety` },
        { label: t(`boats.options.safetyEquipmentType.${item.equipmentType}`) },
      ]"
    />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">
              {{ t(`boats.options.safetyEquipmentType.${item.equipmentType}`) }}
            </BaseHeading>
            <BaseBadge :variant="statusVariant(item.status)">
              {{ t(`boats.options.safetyEquipmentStatus.${item.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}?tab=safety`">
            ← {{ t('boats.safetyEquipmentShow.back') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'info', label: t('boats.safetyEquipmentShow.tabs.info') },
          {
            key: 'photos',
            label: t('boats.safetyEquipmentShow.tabs.photos'),
            badge: String(item.photos.length || ''),
          },
        ]"
      />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <SafetyShowTabInfo v-if="tab === 'info'" :item="item" />
        <SafetyShowTabPhotos v-else :boat="boat" :item="item" :can-manage="canManage" />
      </div>
    </Transition>
  </div>
</template>
