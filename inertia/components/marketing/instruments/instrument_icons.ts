import {
  ArchiveBoxIcon,
  ArrowsUpDownIcon,
  BellAlertIcon,
  BeakerIcon,
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  Cog8ToothIcon,
  CloudIcon,
  EyeIcon,
  FireIcon,
  KeyIcon,
  LockClosedIcon,
  MapPinIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'
import type { InstrumentsMarketingIcon } from '#shared/types/marketing_instruments'

/** Pictogramme Heroicons de chaque clé de la page « instruments connectés » (#995). */
export const INSTRUMENT_ICONS: Record<InstrumentsMarketingIcon, Component> = {
  engine: Cog8ToothIcon,
  navigation: MapPinIcon,
  power: BoltIcon,
  tanks: BeakerIcon,
  environment: CloudIcon,
  alarm: BellAlertIcon,
  clock: ClockIcon,
  chart: ChartBarIcon,
  position: MapPinIcon,
  server: ServerStackIcon,
  lock: LockClosedIcon,
  key: KeyIcon,
  eye: EyeIcon,
  shield: ShieldCheckIcon,
  archive: ArchiveBoxIcon,
  users: UsersIcon,
  depth: ArrowsUpDownIcon,
  temperature: FireIcon,
}
