import type { EquipmentActionType } from '#shared/constants/equipment_action'

/**
 * Degraded equipment statuses across generic (`to_replace`) and safety
 * (`expired`) equipment, plus the shared `to_check`. `ok` is included for
 * exhaustiveness but never yields an action in practice (the UI hides the
 * button for `ok` items).
 */
export type EquipmentStatus = 'ok' | 'to_check' | 'to_replace' | 'expired'

/**
 * Suggests the equipment-action type to pre-fill when raising an action from a
 * degraded equipment status (#313): something already flagged `to_replace` /
 * `expired` suggests a replacement; a `to_check` item suggests a repair.
 */
export function suggestEquipmentActionType(status: EquipmentStatus): EquipmentActionType {
  switch (status) {
    case 'to_replace':
    case 'expired':
      return 'to_replace'
    case 'to_check':
    case 'ok':
    default:
      return 'to_repair'
  }
}
