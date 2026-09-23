import { describe, expect, test } from 'vitest'
import { nextTick, ref } from 'vue'
import { useSingleBoat } from '../../inertia/composables/use_single_boat'

const mistral = { id: 7, name: 'Mistral' }
const zephyr = { id: 8, name: 'Zephyr' }

describe('useSingleBoat (#823)', () => {
  test('an empty fleet has no single boat', () => {
    const { singleBoat, singleBoatId, hasSingleBoat } = useSingleBoat([])
    expect(singleBoat.value).toBeNull()
    expect(singleBoatId.value).toBeNull()
    expect(hasSingleBoat.value).toBe(false)
  })

  test('a fleet of several boats has no single boat', () => {
    const { singleBoat, singleBoatId, hasSingleBoat } = useSingleBoat([mistral, zephyr])
    expect(singleBoat.value).toBeNull()
    expect(singleBoatId.value).toBeNull()
    expect(hasSingleBoat.value).toBe(false)
  })

  test('a fleet of one boat exposes it, with its id as a BaseSelect string', () => {
    const { singleBoat, singleBoatId, hasSingleBoat } = useSingleBoat([mistral])
    expect(singleBoat.value).toBe(mistral)
    expect(singleBoatId.value).toBe('7')
    expect(hasSingleBoat.value).toBe(true)
  })

  test('accepts a getter and follows the list when it narrows down to one boat', async () => {
    const boats = ref([mistral, zephyr])
    const { singleBoatId, hasSingleBoat } = useSingleBoat(() => boats.value)
    expect(hasSingleBoat.value).toBe(false)

    boats.value = [zephyr]
    await nextTick()
    expect(singleBoatId.value).toBe('8')
    expect(hasSingleBoat.value).toBe(true)
  })

  test('accepts a ref and forgets the single boat when a second one arrives', async () => {
    const boats = ref([mistral])
    const { singleBoat, hasSingleBoat } = useSingleBoat(boats)
    expect(singleBoat.value).toEqual(mistral)

    boats.value = [mistral, zephyr]
    await nextTick()
    expect(singleBoat.value).toBeNull()
    expect(hasSingleBoat.value).toBe(false)
  })
})
