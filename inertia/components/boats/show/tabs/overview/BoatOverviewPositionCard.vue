<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { BoatPositionHistoryRow } from '~/types/boat_show'

const props = defineProps<{
  positionLabel: string | null
  boatId: number
  canManage: boolean
  latestGpsPosition: BoatPositionHistoryRow | null
}>()

const { t } = useT()

const showForm = ref(false)
const latitude = ref('')
const longitude = ref('')
const saving = ref(false)

let map: import('leaflet').Map | null = null
let marker: import('leaflet').Marker | null = null

async function initMap() {
  if (!props.latestGpsPosition?.latitude || !props.latestGpsPosition?.longitude) return
  const L = await import('leaflet')

  const lat = props.latestGpsPosition.latitude
  const lng = props.latestGpsPosition.longitude

  map = L.map('boat-position-map', { zoomControl: true }).setView([lat, lng], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const icon = L.divIcon({
    className: '',
    html: '<div class="boat-marker">⚓</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  marker = L.marker([lat, lng], { icon }).addTo(map)
  marker.bindPopup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup()
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  map?.remove()
  map = null
  marker = null
})

watch(
  () => props.latestGpsPosition,
  () => {
    map?.remove()
    map = null
    marker = null
    initMap()
  }
)

function savePosition() {
  const lat = Number.parseFloat(latitude.value)
  const lng = Number.parseFloat(longitude.value)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return

  saving.value = true
  router.post(
    `/boats/${props.boatId}/position`,
    { latitude: lat, longitude: lng },
    {
      preserveScroll: true,
      onFinish: () => {
        saving.value = false
        showForm.value = false
        latitude.value = ''
        longitude.value = ''
      },
    }
  )
}
</script>

<template>
  <BaseCard padded>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.positionTitle') }}</p>
        <BaseButton v-if="canManage" size="xs" variant="ghost" @click="showForm = !showForm">
          {{ showForm ? t('common.cancel') : t('boats.show.position.setGps') }}
        </BaseButton>
      </div>

      <p class="text-sm text-fg-muted">
        {{ positionLabel ?? t('boats.show.overview.positionEmpty') }}
      </p>

      <div v-if="latestGpsPosition?.latitude && latestGpsPosition?.longitude" class="space-y-2">
        <p class="text-xs text-fg-muted">
          {{ t('boats.show.position.gpsCoords') }}
          {{ latestGpsPosition.latitude.toFixed(5) }},
          {{ latestGpsPosition.longitude.toFixed(5) }}
        </p>
        <div
          id="boat-position-map"
          class="h-40 w-full overflow-hidden rounded-md border border-border"
        />
      </div>

      <div v-if="showForm && canManage" class="space-y-3 rounded-md border border-border p-3">
        <p class="text-xs font-medium text-fg">{{ t('boats.show.position.manualTitle') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <BaseInput
            id="position-lat"
            name="latitude"
            :label="t('boats.show.position.latitude')"
            inputmode="decimal"
            v-model="latitude"
            :errors="{}"
          />
          <BaseInput
            id="position-lng"
            name="longitude"
            :label="t('boats.show.position.longitude')"
            inputmode="decimal"
            v-model="longitude"
            :errors="{}"
          />
        </div>
        <BaseButton size="sm" :disabled="saving" @click="savePosition">
          {{ saving ? t('common.saving') : t('boats.show.position.saveGps') }}
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>
