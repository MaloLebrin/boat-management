import type { MediaRow } from '~/types/boat_show'

/** Photos d'un bateau (hors documents), dans l'ordre d'affichage. */
export function sortedBoatPhotos(media: MediaRow[]): MediaRow[] {
  return media.filter((m) => m.kind === 'photo').sort((a, b) => a.position - b.position)
}
