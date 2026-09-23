import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'

export interface UseSingleBoatReturn<T extends { id: number }> {
  /** Le seul bateau de la flotte, sinon `null`. */
  singleBoat: ComputedRef<T | null>
  /** Son identifiant au format `BaseSelect` (chaîne), sinon `null`. */
  singleBoatId: ComputedRef<string | null>
  hasSingleBoat: ComputedRef<boolean>
}

/**
 * Flotte mono-bateau (#603, généralisé par #823) : le choix est déjà fait, les
 * écrans masquent leur sélecteur de bateau et retiennent ce bateau d'office.
 *
 * Passer un getter (`() => props.boats`) pour suivre le remplacement de la prop.
 */
export function useSingleBoat<T extends { id: number }>(
  boats: MaybeRefOrGetter<readonly T[]>
): UseSingleBoatReturn<T> {
  const singleBoat = computed(() => {
    const list = toValue(boats)
    return list.length === 1 ? list[0] : null
  })
  const singleBoatId = computed(() => (singleBoat.value ? String(singleBoat.value.id) : null))
  const hasSingleBoat = computed(() => singleBoat.value !== null)

  return { singleBoat, singleBoatId, hasSingleBoat }
}
