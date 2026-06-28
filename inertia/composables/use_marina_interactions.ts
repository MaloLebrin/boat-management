import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import type { Ref } from 'vue'
import type { PontoonRow, MouillageRow } from '~/types/port'

export type LocalPontoon = PontoonRow & { x: number; y: number }
export type LocalMouillage = MouillageRow & { x: number; y: number }
export type SelectedSpotInfo = {
  id: number
  name: string
  boat: { id: number; name: string } | null
}

export function useMarinaInteractions(
  portId: Ref<number>,
  localPontoons: Ref<LocalPontoon[]>,
  localMouillages: Ref<LocalMouillage[]>
) {
  const selectedSpot = ref<SelectedSpotInfo | null>(null)
  const showAssignModal = ref(false)

  function patchPosition(url: string, body: { x: number; y: number }) {
    router.patch(url, body, { preserveScroll: true })
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

  function handleCanvasClick() {}

  function handleSpotClick(info: { spotId: number; boat: { id: number; name: string } | null }) {
    let spotName = ''
    for (const pt of localPontoons.value) {
      const spot = pt.spots.find((s) => s.id === info.spotId)
      if (spot) {
        spotName = spot.name
        break
      }
    }
    if (!spotName) {
      for (const m of localMouillages.value) {
        const spot = m.spots.find((s) => s.id === info.spotId)
        if (spot) {
          spotName = spot.name
          break
        }
      }
    }
    selectedSpot.value = { id: info.spotId, name: spotName, boat: info.boat }
    showAssignModal.value = true
  }

  function handleAssignConfirm({ spotId, boatId }: { spotId: number; boatId: number | null }) {
    showAssignModal.value = false
    const currentBoat = selectedSpot.value?.boat ?? null
    selectedSpot.value = null

    const patchOpts = { preserveScroll: true, only: ['port'] as const }

    if (boatId === null) {
      if (currentBoat) {
        router.patch(`/boats/${currentBoat.id}/assignment`, { spotId: null }, patchOpts)
      }
      return
    }

    if (currentBoat && currentBoat.id !== boatId) {
      router.patch(
        `/boats/${currentBoat.id}/assignment`,
        { spotId: null },
        {
          ...patchOpts,
          onSuccess: () => {
            router.patch(`/boats/${boatId}/assignment`, { spotId }, patchOpts)
          },
        }
      )
    } else {
      router.patch(`/boats/${boatId}/assignment`, { spotId }, patchOpts)
    }
  }

  return {
    selectedSpot,
    showAssignModal,
    handlePontoonDragEnd,
    handleMouillageDragEnd,
    handleCanvasClick,
    handleSpotClick,
    handleAssignConfirm,
  }
}
