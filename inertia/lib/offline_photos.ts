/**
 * Photos prises hors-ligne (#969, épic « Mode traversée » #949).
 *
 * Une photo de téléphone pèse 3 à 8 Mo ; trois semaines d'incidents et
 * d'avaries en file IndexedDB rempliraient le quota d'un navigateur mobile. On
 * la réduit donc avant de l'enfiler, et on refuse proprement quand la place
 * manque — mieux qu'un `QuotaExceededError` qui emporterait la saisie.
 */

/** Plus grand côté conservé : lisible pour une avarie, ~0,5 Mo en JPEG. */
export const OFFLINE_PHOTO_MAX_DIMENSION = 2048
export const OFFLINE_PHOTO_QUALITY = 0.8

/**
 * Marge gardée libre sous le quota : la file n'est pas seule sur l'origine
 * (caches du service worker, #967), et l'estimation du navigateur est arrondie.
 */
export const OFFLINE_STORAGE_MARGIN_BYTES = 20 * 1024 * 1024

/**
 * Formats qu'on ne réencode pas : un GIF perdrait son animation, et un HEIC
 * n'est décodable que par Safari — ailleurs `createImageBitmap` échouerait de
 * toute façon. Ils partent tels quels.
 */
const KEPT_AS_IS = new Set(['image/gif', 'image/heic', 'image/heif'])

/** Dimensions réduites à `max` sur le plus grand côté, ratio conservé. */
export function scaledDimensions(width: number, height: number, max: number) {
  const ratio = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

/** `photo.png` → `photo.jpg` : le nom suit le format réellement envoyé. */
export function jpegName(name: string): string {
  const dot = name.lastIndexOf('.')
  return `${dot > 0 ? name.slice(0, dot) : name}.jpg`
}

async function encodeJpeg(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0, width, height)
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', OFFLINE_PHOTO_QUALITY)
  )
}

/**
 * Réduit une photo avant sa mise en file. Ne lève jamais : un format non
 * décodable, une API absente ou un résultat plus lourd que l'original rendent
 * le fichier d'origine — la photo part non compressée plutôt que pas du tout.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (KEPT_AS_IS.has(file.type) || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = scaledDimensions(
      bitmap.width,
      bitmap.height,
      OFFLINE_PHOTO_MAX_DIMENSION
    )
    const blob = await encodeJpeg(bitmap, width, height)
    bitmap.close()
    if (!blob || blob.size >= file.size) return file
    return new File([blob], jpegName(file.name), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * La file peut-elle encore accueillir `bytes` ? Sans estimation (API absente,
 * navigateur ancien), on accepte : refuser une photo faute de savoir serait
 * pire que de risquer l'échec d'écriture, qui reste attrapé.
 */
export function hasRoomFor(bytes: number, estimate: { usage: number; quota: number } | null) {
  if (!estimate || estimate.quota <= 0) return true
  return estimate.quota - estimate.usage - OFFLINE_STORAGE_MARGIN_BYTES >= bytes
}
