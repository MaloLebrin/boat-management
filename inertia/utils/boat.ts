import type Boat from '../../app/models/boat'

export function getBoatIcon(boat: Boat) {
  switch (boat?.type) {
    case 'sailboat':
      return '⛵'
    case 'motorboat':
      return '🚤'
    case 'catamaran':
      return '⛵︎'
    case 'other':
      return '🚤'

    default:
      return '🚤'
  }
}
