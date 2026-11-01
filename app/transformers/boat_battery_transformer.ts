import type BoatBattery from '#models/boat_battery'
import type BoatTank from '#models/boat_tank'
import type { BoatBatteryRow, BoatTankRow } from '#shared/types/boat'

export function toBoatBatteryRow(battery: BoatBattery): BoatBatteryRow {
  return {
    id: battery.id,
    name: battery.name,
    chemistry: battery.chemistry,
    capacityAh: battery.capacityAh,
    nominalVoltage: toNumberOrNull(battery.nominalVoltage),
    lowVoltageV: toNumberOrNull(battery.lowVoltageV),
    position: battery.position,
    instrumentKey: battery.instrumentKey,
  }
}

export function toBoatTankRow(tank: BoatTank): BoatTankRow {
  return {
    id: tank.id,
    name: tank.name,
    type: tank.type,
    capacityL: tank.capacityL,
    lowLevelPct: tank.lowLevelPct,
    instrumentKey: tank.instrumentKey,
  }
}

function toNumberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value)
}
