import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  compressPhoto,
  hasRoomFor,
  jpegName,
  OFFLINE_PHOTO_MAX_DIMENSION,
  OFFLINE_STORAGE_MARGIN_BYTES,
  scaledDimensions,
} from '../../inertia/lib/offline_photos'

// #969 — photos prises hors-ligne : réduction avant mise en file et garde de quota.

const MB = 1024 * 1024

function photo(name: string, type: string, bytes: number) {
  return new File([new Uint8Array(bytes)], name, { type })
}

/** `createImageBitmap` + canvas simulés : le JPEG produit pèse `outputBytes`. */
function stubEncoder(outputBytes: number | null, size = { width: 4000, height: 3000 }) {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ ...size, close }))
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D)
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(function (callback) {
      callback(outputBytes === null ? null : new Blob([new Uint8Array(outputBytes)]))
    })
  return { close, drawImage, toBlob }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('scaledDimensions', () => {
  test('réduit le plus grand côté à la borne, ratio conservé', () => {
    expect(scaledDimensions(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 })
    expect(scaledDimensions(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 })
  })

  test("n'agrandit jamais une petite photo", () => {
    expect(scaledDimensions(800, 600, 2048)).toEqual({ width: 800, height: 600 })
  })
})

describe('jpegName', () => {
  test("remplace l'extension par .jpg", () => {
    expect(jpegName('avarie.png')).toBe('avarie.jpg')
    expect(jpegName('IMG.2024.webp')).toBe('IMG.2024.jpg')
  })

  test('ajoute .jpg à un nom sans extension', () => {
    expect(jpegName('photo')).toBe('photo.jpg')
    expect(jpegName('.hidden')).toBe('.hidden.jpg')
  })
})

describe('hasRoomFor', () => {
  test('accepte sans estimation : refuser faute de savoir serait pire', () => {
    expect(hasRoomFor(500 * MB, null)).toBe(true)
    expect(hasRoomFor(500 * MB, { usage: 0, quota: 0 })).toBe(true)
  })

  test('garde la marge libre sous le quota', () => {
    const quota = 100 * MB
    const free = quota - OFFLINE_STORAGE_MARGIN_BYTES
    expect(hasRoomFor(free, { usage: 0, quota })).toBe(true)
    expect(hasRoomFor(free + 1, { usage: 0, quota })).toBe(false)
    expect(hasRoomFor(1, { usage: quota, quota })).toBe(false)
  })
})

describe('compressPhoto', () => {
  test('réencode en JPEG réduit quand le résultat est plus léger', async () => {
    const { drawImage, toBlob, close } = stubEncoder(400_000)
    const original = photo('avarie.png', 'image/png', 5 * MB)

    const result = await compressPhoto(original)

    expect(result).not.toBe(original)
    expect(result.name).toBe('avarie.jpg')
    expect(result.type).toBe('image/jpeg')
    expect(result.size).toBe(400_000)
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      OFFLINE_PHOTO_MAX_DIMENSION,
      1536
    )
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)
    expect(close).toHaveBeenCalled()
  })

  test("garde l'original quand le réencodage ne gagne rien", async () => {
    stubEncoder(2 * MB, { width: 800, height: 600 })
    const original = photo('petite.jpg', 'image/jpeg', MB)

    expect(await compressPhoto(original)).toBe(original)
  })

  test("garde l'original quand le canvas ne rend rien", async () => {
    stubEncoder(null)
    const original = photo('a.jpg', 'image/jpeg', MB)

    expect(await compressPhoto(original)).toBe(original)
  })

  test('ne touche ni aux GIF (animation) ni aux HEIC (non décodables hors Safari)', async () => {
    const { toBlob } = stubEncoder(10)
    for (const original of [
      photo('a.gif', 'image/gif', MB),
      photo('b.heic', 'image/heic', MB),
      photo('c.heif', 'image/heif', MB),
    ]) {
      expect(await compressPhoto(original)).toBe(original)
    }
    expect(toBlob).not.toHaveBeenCalled()
  })

  test("garde l'original quand le décodage échoue ou que l'API manque", async () => {
    const original = photo('a.jpg', 'image/jpeg', MB)

    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
    expect(await compressPhoto(original)).toBe(original)

    vi.stubGlobal('createImageBitmap', undefined)
    expect(await compressPhoto(original)).toBe(original)
  })
})
