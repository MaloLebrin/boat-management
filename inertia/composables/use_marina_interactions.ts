import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import type { Ref } from 'vue'
import type { PontoonRow, MouillageRow } from '~/types/port'

export type LocalPontoon = PontoonRow & { x: number; y: number }
export type LocalMouillage = MouillageRow & { x: number; y: number }

export function useMarinaInteractions(
  portId: Ref<number>,
  localPontoons: Ref<LocalPontoon[]>,
  localMouillages: Ref<LocalMouillage[]>
) {
  const selectedBoat = ref<{ id: number; name: string } | null>(null)

  function patchPosition(url: string, body: { x: number; y: number }) {
    router.patch(url, body, { preserveScroll: true })
  }

  function patchAssignment(url: string, spotId: number) {
    router.patch(
      url,
      { spotId },
      {
        preserveScroll: true,
        only: ['port'],
        onSuccess: () => {
          selectedBoat.value = null
        },
      }
    )
  }

  function handlePontoonDragEnd(pontoonId: number, x: number, y: number) {
    const pt = localPontoons.value.find((p) => p.id === pontoonId)
    if (!pt) return
    pt.x = x
    pt.y = y
    patchPosition(`/ports/${portId.value}/pontoons/${pontoonId}/position`, { x, y })
  }

  function handleMouillageDragEnd(mouillageId: number, x: number, y: number) {
    const m = localMouillages.value.find((mo) => mo.id === mouillageId)
    if (!m) return
    m.x = x
    m.y = y
    patchPosition(`/ports/${portId.value}/mouillages/${mouillageId}/position`, { x, y })
  }

  function handleCanvasClick() {
    selectedBoat.value = null
  }

  function handleSpotClick(info: { spotId: number; boat: { id: number; name: string } | null }) {
    if (info.boat && selectedBoat.value?.id === info.boat.id) {
      selectedBoat.value = null
      return
    }
    if (info.boat && !selectedBoat.value) {
      selectedBoat.value = info.boat
      return
    }
    if (!info.boat && selectedBoat.value) {
      patchAssignment(`/boats/${selectedBoat.value.id}/assignment`, info.spotId)
      return
    }
    if (info.boat && selectedBoat.value && info.boat.id !== selectedBoat.value.id) {
      patchAssignment(`/boats/${selectedBoat.value.id}/assignment`, info.spotId)
    }
  }

  return {
    selectedBoat,
    handlePontoonDragEnd,
    handleMouillageDragEnd,
    handleCanvasClick,
    handleSpotClick,
  }
}
