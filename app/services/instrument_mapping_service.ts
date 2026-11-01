import { isTankType } from '#shared/constants/tanks'
import type { InstrumentMappingProposal } from '#shared/types/instruments'

/** Traducteur injecté : le service reste pur, l'appelant fournit `i18n.t`. */
export type MappingTranslate = (key: string, params?: Record<string, string>) => string

export interface MappingDevice {
  label: string
  manufacturer: string | null
  model: string | null
  paths: string[]
  goneAt: unknown | null
}

export interface MappingEngine {
  id: number
  instrumentKey: string | null
}

export interface MappingBattery {
  id: number
  name: string
  instrumentKey: string | null
}

export interface MappingTank {
  id: number
  name: string
  type: string
  instrumentKey: string | null
}

export interface MappingInput {
  devices: readonly MappingDevice[]
  engines: readonly MappingEngine[]
  batteries: readonly MappingBattery[]
  tanks: readonly MappingTank[]
  translate: MappingTranslate
}

interface Found {
  key: string
  device: MappingDevice
}

const ENGINE_RE = /^propulsion\.([A-Za-z0-9_-]+)\./
const BATTERY_RE = /^electrical\.batteries\.([A-Za-z0-9_-]+)\./
const TANK_RE = /^tanks\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\./

/**
 * Propositions de rattachement (#1037), **pures** : inventaire des appareils
 * (#1036) + équipements existants → lignes de l'étape « Relier les équipements ».
 *
 * - Une clé déjà portée par un équipement n'est pas reproposée.
 * - Batterie / cuve : relie l'équipement existant du même nom (insensible à la
 *   casse et aux accents) qui n'a pas de clé, sinon propose de le créer.
 * - Moteur : jamais créé depuis un appareil. FleetAi ne nomme pas ses moteurs,
 *   donc le seul appariement sûr est « un moteur sans clé, une clé sans moteur » ;
 *   sinon `existingId: null` (reste à relier à la main).
 * - Cuve d'un type hors catalogue : ignorée (elle n'aurait ni nom ni seuil).
 * - Appareil disparu (`goneAt`) : ses chemins ne sont pas proposés.
 */
export function proposeInstrumentMapping(input: MappingInput): InstrumentMappingProposal[] {
  const devices = input.devices.filter((device) => device.goneAt === null)
  return [
    ...proposeEngines(devices, input),
    ...proposeBatteries(devices, input),
    ...proposeTanks(devices, input),
  ]
}

function collect(devices: readonly MappingDevice[], match: (path: string) => string | null) {
  const found = new Map<string, Found>()
  for (const device of devices) {
    for (const path of device.paths) {
      const key = match(path)
      if (key !== null && !found.has(key)) found.set(key, { key, device })
    }
  }
  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function deviceName(device: MappingDevice): string {
  const model = [device.manufacturer, device.model].filter(Boolean).join(' ')
  return model || device.label
}

function withDevice(base: string, device: MappingDevice | null): string {
  return device ? `${base} (${deviceName(device)})` : base
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

function proposeEngines(devices: readonly MappingDevice[], input: MappingInput) {
  const taken = new Set(input.engines.map((engine) => engine.instrumentKey).filter(Boolean))
  const found = collect(devices, (path) => ENGINE_RE.exec(path)?.[1] ?? null).filter(
    ({ key }) => !taken.has(key)
  )
  const unlinked = input.engines.filter((engine) => engine.instrumentKey === null)
  const unambiguous = found.length === 1 && unlinked.length === 1

  return found.map(
    ({ key, device }): InstrumentMappingProposal => ({
      kind: 'engine',
      instrumentKey: key,
      deviceLabel: deviceName(device),
      suggestedName: engineName(key, input.translate),
      existingId: unambiguous ? unlinked[0].id : null,
      tankType: null,
    })
  )
}

function engineName(key: string, t: MappingTranslate): string {
  if (key === 'port' || key === 'starboard') return t(`instruments.mapping.names.engine.${key}`)
  if (/^\d+$/.test(key)) {
    return t('instruments.mapping.names.engine.indexed', { index: String(Number(key) + 1) })
  }
  return t('instruments.mapping.names.engine.other', { id: key })
}

function proposeBatteries(devices: readonly MappingDevice[], input: MappingInput) {
  const taken = new Set(input.batteries.map((battery) => battery.instrumentKey).filter(Boolean))
  const unlinked = input.batteries.filter((battery) => battery.instrumentKey === null)
  const used = new Set<number>()

  return collect(devices, (path) => BATTERY_RE.exec(path)?.[1] ?? null)
    .filter(({ key }) => !taken.has(key))
    .map(({ key, device }): InstrumentMappingProposal => {
      const role = batteryName(key, input.translate)
      const existing = unlinked.find(
        (battery) => !used.has(battery.id) && normalize(battery.name) === normalize(role)
      )
      if (existing) used.add(existing.id)
      return {
        kind: 'battery',
        instrumentKey: key,
        deviceLabel: deviceName(device),
        suggestedName: existing ? existing.name : withDevice(role, device),
        existingId: existing?.id ?? null,
        tankType: null,
      }
    })
}

function batteryName(key: string, t: MappingTranslate): string {
  if (key === 'house' || key === 'start' || key === 'starter') {
    return t(`instruments.mapping.names.battery.${key === 'starter' ? 'start' : key}`)
  }
  if (/^\d+$/.test(key)) {
    return t('instruments.mapping.names.battery.indexed', { index: String(Number(key) + 1) })
  }
  return t('instruments.mapping.names.battery.other', { id: key })
}

function proposeTanks(devices: readonly MappingDevice[], input: MappingInput) {
  const taken = new Set(input.tanks.map((tank) => tank.instrumentKey).filter(Boolean))
  const unlinked = input.tanks.filter((tank) => tank.instrumentKey === null)
  const used = new Set<number>()

  const found = collect(devices, (path) => {
    const match = TANK_RE.exec(path)
    return match && isTankType(match[1]) ? `${match[1]}.${match[2]}` : null
  }).filter(({ key }) => !taken.has(key))

  const countByType = new Map<string, number>()
  for (const { key } of found) {
    const type = key.split('.')[0]
    countByType.set(type, (countByType.get(type) ?? 0) + 1)
  }

  return found.map(({ key, device }): InstrumentMappingProposal => {
    const [type, id] = key.split('.')
    const indexed = (countByType.get(type) ?? 0) > 1 || /^[1-9]\d*$/.test(id)
    const role = input.translate(`instruments.mapping.names.tank.${type}`)
    const base = indexed && /^\d+$/.test(id) ? `${role} ${Number(id) + 1}` : role
    const existing = unlinked.find(
      (tank) => !used.has(tank.id) && tank.type === type && normalize(tank.name) === normalize(base)
    )
    if (existing) used.add(existing.id)
    return {
      kind: 'tank',
      instrumentKey: key,
      deviceLabel: deviceName(device),
      suggestedName: existing ? existing.name : withDevice(base, device),
      existingId: existing?.id ?? null,
      tankType: type,
    }
  })
}
